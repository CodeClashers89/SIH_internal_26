"""
Tool Definitions and Executor for the Farmer AI Assistant.

Tools provide controlled access to KisanConnect APIs and business logic.
The LLM can request tool calls, but actual execution happens server-side
with proper authorization and validation.
"""

import logging
from typing import Dict, Any, Tuple, Optional, List
from decimal import Decimal
import json

logger = logging.getLogger(__name__)


class ToolExecutor:
    """
    Executes tool calls requested by the LLM.
    Each tool is properly authorized and validated.
    """

    def __init__(self, farmer_user):
        """
        Initialize tool executor for a specific farmer.

        Args:
            farmer_user: The authenticated farmer User object
        """
        self.farmer_user = farmer_user
        self.farmer_id = farmer_user.id

    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool with the given arguments.

        Args:
            tool_name: Name of the tool to execute
            arguments: Dictionary of tool arguments

        Returns:
            Dictionary with 'status', 'data', and optional 'error'
        """
        logger.info(f"Executing tool: {tool_name} with args: {arguments}")

        tool_method = getattr(self, f'tool_{tool_name}', None)
        if not tool_method:
            return {
                'status': 'error',
                'error': f'Unknown tool: {tool_name}',
                'tool_name': tool_name,
            }

        try:
            result = tool_method(arguments)
            return {
                'status': 'success',
                'tool_name': tool_name,
                'data': result,
            }
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return {
                'status': 'error',
                'tool_name': tool_name,
                'error': str(e),
            }

    # ========== FARMER PROFILE TOOLS ==========

    def tool_get_farmer_profile(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get current farmer's profile information."""
        from farmer_profile.models import FarmerProfile

        try:
            profile = FarmerProfile.objects.get(user=self.farmer_user)
            return {
                'farmer_id': self.farmer_id,
                'full_name': profile.full_name,
                'farm_name': profile.farm_name,
                'village': profile.village,
                'taluka': profile.taluka,
                'state': profile.state,
                'farm_size': f"{profile.farm_size_value} {profile.farm_size_unit}",
                'primary_crops': profile.primary_crops,
                'trust_score': profile.trust_score,
                'avg_rating': float(profile.avg_rating),
                'total_trips': profile.total_trips,
            }
        except FarmerProfile.DoesNotExist:
            return {
                'farmer_id': self.farmer_id,
                'message': 'Farmer profile not yet created. Please complete your profile first.',
            }

    def tool_get_farmer_stats(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get farmer's key statistics and performance metrics."""
        from farmer_profile.models import FarmerProfile
        from products.models import Product
        from orders.models import Order
        from django.db.models import Count, Sum, Avg
        from django.utils import timezone
        from datetime import timedelta

        try:
            profile = FarmerProfile.objects.get(user=self.farmer_user)
            
            # Get active listings
            active_listings = Product.objects.filter(
                farmer=self.farmer_user,
                expiry_date__gte=timezone.now().date()
            ).count()

            # Get pending orders (orders where farmer has products)
            pending_orders = Order.objects.filter(
                items__product__farmer=self.farmer_user,
                status__in=['placed', 'confirmed', 'packed', 'in_transit']
            ).distinct().count()

            # Get earnings (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_earnings = Order.objects.filter(
                items__product__farmer=self.farmer_user,
                status='delivered',
                updated_at__gte=thirty_days_ago
            ).distinct().aggregate(total=Sum('product_subtotal'))

            return {
                'active_listings': active_listings,
                'pending_orders': pending_orders,
                'earnings_last_30_days': float(recent_earnings['total'] or 0),
                'trust_score': profile.trust_score,
                'avg_rating': float(profile.avg_rating),
                'avg_freshness': float(profile.avg_freshness),
                'on_time_rate': float(profile.ontime_rate),
            }
        except Exception as e:
            return {'error': f'Could not retrieve stats: {str(e)}'}

    # ========== PRODUCT/LISTING TOOLS ==========

    def tool_get_active_listings(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get farmer's currently active product listings."""
        from products.models import Product
        from django.utils import timezone

        listings = Product.objects.filter(
            farmer=self.farmer_user,
            expiry_date__gte=timezone.now().date()
        ).order_by('-created_at')[:20]  # Limit to 20 recent listings

        return [
            {
                'id': listing.id,
                'name': listing.name,
                'category': listing.category,
                'quantity': float(listing.quantity),
                'unit': listing.unit,
                'price_per_unit': float(listing.price_per_unit),
                'harvest_date': listing.harvest_date.isoformat(),
                'expiry_date': listing.expiry_date.isoformat(),
                'freshness': listing.freshness_percentage,
            }
            for listing in listings
        ]

    def tool_create_listing(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new product listing.
        Requires: name, category, quantity, unit, price_per_unit, harvest_date, expiry_date
        """
        from products.models import Product
        from django.utils import timezone
        from datetime import datetime

        required_fields = ['name', 'category', 'quantity', 'unit', 'price_per_unit']
        for field in required_fields:
            if field not in args:
                return {
                    'status': 'error',
                    'error': f'Missing required field: {field}'
                }

        try:
            # Parse dates if provided
            harvest_date = datetime.fromisoformat(args.get('harvest_date', datetime.now().isoformat())).date()
            expiry_date = datetime.fromisoformat(args.get('expiry_date')).date()

            product = Product.objects.create(
                farmer=self.farmer_user,
                name=args['name'],
                category=args['category'],
                quantity=Decimal(str(args['quantity'])),
                unit=args['unit'],
                price_per_unit=Decimal(str(args['price_per_unit'])),
                harvest_date=harvest_date,
                expiry_date=expiry_date,
                description=args.get('description', ''),
            )

            return {
                'id': product.id,
                'message': f"Listing created successfully for {args['quantity']} {args['unit']} of {args['name']} at ₹{args['price_per_unit']}/{args['unit']}",
                'product_id': product.id,
                'name': product.name,
                'quantity': float(product.quantity),
                'price': float(product.price_per_unit),
            }
        except Exception as e:
            logger.error(f"Error creating listing: {str(e)}")
            return {
                'status': 'error',
                'error': f'Failed to create listing: {str(e)}'
            }

    def tool_update_listing(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing product listing.
        Supports lookup by product_id (int or str) or fuzzy lookup by name/crop_name.
        """
        from products.models import Product

        product_id = args.get('product_id')
        name = args.get('name') or args.get('crop_name')

        product = None
        if product_id:
            try:
                clean_id = int(str(product_id).replace('#', '').strip())
                product = Product.objects.filter(id=clean_id, farmer=self.farmer_user).first()
            except (ValueError, TypeError):
                name = str(product_id)

        if not product and name:
            product = Product.objects.filter(
                farmer=self.farmer_user,
                name__icontains=name.strip()
            ).first()

        if not product:
            active = Product.objects.filter(farmer=self.farmer_user)
            active_names = [f"#{p.id} ({p.name})" for p in active]
            return {
                'status': 'error',
                'error': f"Listing '{product_id or name}' not found. Your active listings are: {', '.join(active_names) if active_names else 'None'}"
            }

        if 'price_per_unit' in args and args['price_per_unit'] is not None:
            product.price_per_unit = Decimal(str(args['price_per_unit']))
        if 'quantity' in args and args['quantity'] is not None:
            product.quantity = Decimal(str(args['quantity']))
        if 'description' in args and args['description'] is not None:
            product.description = args['description']

        product.save()

        return {
            'status': 'success',
            'message': f"Listing #{product.id} ({product.name}) updated successfully to ₹{product.price_per_unit}/{product.unit}, quantity: {product.quantity} {product.unit}",
            'product_id': product.id,
            'name': product.name,
            'price': float(product.price_per_unit),
            'quantity': float(product.quantity),
            'unit': product.unit,
        }

    def tool_delete_listing(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Delete an existing product listing.
        Supports lookup by product_id or fuzzy lookup by name/crop_name.
        """
        from products.models import Product

        product_id = args.get('product_id')
        name = args.get('name') or args.get('crop_name')

        product = None
        if product_id:
            try:
                clean_id = int(str(product_id).replace('#', '').strip())
                product = Product.objects.filter(id=clean_id, farmer=self.farmer_user).first()
            except (ValueError, TypeError):
                name = str(product_id)

        if not product and name:
            product = Product.objects.filter(
                farmer=self.farmer_user,
                name__icontains=name.strip()
            ).first()

        if not product:
            active = Product.objects.filter(farmer=self.farmer_user)
            active_names = [f"#{p.id} ({p.name})" for p in active]
            return {
                'status': 'error',
                'error': f"Listing '{product_id or name}' not found. Your active listings are: {', '.join(active_names) if active_names else 'None'}"
            }

        p_id = product.id
        p_name = product.name
        product.delete()

        return {
            'status': 'success',
            'message': f"Listing #{p_id} ({p_name}) deleted successfully",
            'product_id': p_id,
            'name': p_name,
        }

    # ========== ORDER TOOLS ==========

    def tool_get_farmer_orders(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get all orders belonging to the farmer with real-time status and driver info."""
        from orders.models import Order

        status_filter = args.get('status')
        queryset = Order.objects.filter(
            items__product__farmer=self.farmer_user
        ).distinct().select_related('buyer', 'shipment', 'shipment__partner').order_by('-created_at')

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        orders = queryset[:20]

        results = []
        for order in orders:
            shipment = getattr(order, 'shipment', None)
            results.append({
                'id': order.id,
                'status': order.status,
                'total_amount': float(order.total_amount),
                'created_at': order.created_at.isoformat(),
                'buyer': order.buyer.username,
                'shipment_status': shipment.status if shipment else None,
                'driver_name': shipment.partner.name if (shipment and shipment.partner) else None,
            })
        return results

    def tool_get_pending_orders(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get active/pending/in-transit orders belonging to this farmer."""
        from orders.models import Order

        orders = Order.objects.filter(
            items__product__farmer=self.farmer_user,
            status__in=['placed', 'confirmed', 'packed', 'in_transit']
        ).distinct().select_related('buyer', 'shipment', 'shipment__partner').order_by('-created_at')[:15]

        results = []
        for order in orders:
            shipment = getattr(order, 'shipment', None)
            results.append({
                'id': order.id,
                'status': order.status,
                'total_amount': float(order.total_amount),
                'created_at': order.created_at.isoformat(),
                'buyer': order.buyer.username,
                'shipment_status': shipment.status if shipment else None,
                'driver_name': shipment.partner.name if (shipment and shipment.partner) else None,
            })
        return results

    def tool_get_order_details(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed real-time information about a specific order."""
        from orders.models import Order

        if 'order_id' not in args:
            return {'error': 'order_id is required'}

        try:
            order = Order.objects.select_related('buyer', 'shipment', 'shipment__partner').get(
                id=args['order_id'],
                items__product__farmer=self.farmer_user
            )
            shipment = getattr(order, 'shipment', None)

            res = {
                'id': order.id,
                'status': order.status,
                'total_amount': float(order.total_amount),
                'product_subtotal': float(order.product_subtotal),
                'shipping_charge': float(order.shipping_charge),
                'shipping_address': order.shipping_address,
                'shipping_pincode': order.shipping_pincode,
                'payment_status': order.payment_status,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'buyer': order.buyer.username,
            }

            if shipment:
                res['shipment_id'] = shipment.id
                res['shipment_status'] = shipment.status
                res['pickup_address'] = shipment.pickup_address
                res['delivery_address'] = shipment.delivery_address
                res['distance_km'] = float(shipment.distance_km)
                res['driver_name'] = shipment.partner.name if shipment.partner else None
                res['delivery_otp'] = shipment.delivery_otp

            return res
        except Order.DoesNotExist:
            return {'error': f'Order #{args["order_id"]} not found or does not belong to you'}

    # ========== MARKET PRICE TOOLS ==========

    def tool_get_market_prices(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get current market prices for a crop in a location.
        Args: crop (required), location (optional - defaults to farmer's location)
        """
        import os
        import requests
        from datetime import datetime
        from django.utils import timezone

        crop = (args.get('crop') or '').lower()
        location = args.get('location') or ''

        if not crop:
            return {'error': 'crop parameter is required'}

        api_key = os.environ.get("DATA_GOV_API_KEY")
        records = []

        if api_key:
            url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
            params = {
                "api-key": api_key,
                "format": "json",
                "limit": 15,
                "filters[commodity]": crop.capitalize()
            }
            if location:
                # Approximate filtering for location via district or market
                params["filters[district]"] = location.capitalize()
            
            try:
                response = requests.get(url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                records = data.get("records", [])
            except Exception as e:
                logger.error(f"AGMARKNET API call failed: {e}")
        
        if not records:
            # Fallback to mock data if API fails or returns no records
            from pricing.services import MOCK_AGMARKNET_DATA
            
            mock_records = MOCK_AGMARKNET_DATA["records"]
            records = [
                r for r in mock_records 
                if crop.lower() in r.get("commodity", "").lower()
            ]
            
            if location:
                records = [
                    r for r in records
                    if location.lower() in r.get("district", "").lower() or 
                       location.lower() in r.get("market", "").lower()
                ]
            
            if not records:
                return {
                    'message': f'No market data found for {crop}',
                    'crop': crop,
                    'location': location or 'all',
                }

        # Format API records
        formatted_prices = []
        for r in records:
            try:
                min_p = float(r.get("min_price", 0))
                max_p = float(r.get("max_price", 0))
                modal_p = float(r.get("modal_price", 0))
            except (ValueError, TypeError):
                min_p = max_p = modal_p = 0.0
            
            date_str = r.get('arrival_date', '')
            try:
                dt = datetime.strptime(date_str, '%d/%m/%Y').date().isoformat()
            except:
                dt = date_str

            formatted_prices.append({
                'market': r.get("market", ""),
                'district': r.get("district", ""),
                'date': dt,
                'min_price': min_p,
                'max_price': max_p,
                'modal_price': modal_p,
            })

        return {
            'crop': crop,
            'location': location or 'all',
            'prices': formatted_prices
        }

    def tool_get_price_recommendation(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get price recommendation based on market data and product details.
        Args: crop, quantity, location (optional)
        """
        from pricing.models import MarketPrice
        from django.utils import timezone
        from datetime import timedelta

        crop = (args.get('crop') or '').lower()
        if not crop:
            return {'error': 'crop parameter is required'}

        # Get recent market prices for this crop
        seven_days_ago = (timezone.now() - timedelta(days=7)).date()
        prices = MarketPrice.objects.filter(
            commodity__icontains=crop,
            reported_date__gte=seven_days_ago,
            modal_price__isnull=False
        ).values_list('modal_price', flat=True)

        if not prices:
            return {
                'message': f'No recent market data for {crop}. Please check market prices directly.',
                'crop': crop,
            }

        # Calculate average, min, max from market data
        price_list = [float(p) for p in prices]
        avg_price = sum(price_list) / len(price_list)
        min_price = min(price_list)
        max_price = max(price_list)

        # Recommend a competitive price (slightly below market average)
        recommended_price = avg_price * 0.95

        return {
            'crop': crop,
            'quantity': args.get('quantity'),
            'recommended_price': round(recommended_price, 2),
            'market_avg': round(avg_price, 2),
            'market_min': round(min_price, 2),
            'market_max': round(max_price, 2),
            'note': 'Recommendation based on recent market data. Adjust based on quality and demand.',
        }

    # ========== TRACKABLE SHIPMENTS TOOL ==========

    def tool_get_trackable_shipments(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get all orders with active/trackable shipments for the farmer.
        Returns orders in packed, in_transit, picked_up states that have
        an associated DeliveryShipment. Used for disambiguation when the
        farmer asks to "check shipment status" without specifying an order.
        """
        from orders.models import Order
        from logistics.models import DeliveryShipment

        # Query orders belonging to this farmer that are in a trackable state
        trackable_statuses = ['packed', 'in_transit']
        orders = Order.objects.filter(
            items__product__farmer=self.farmer_user,
            status__in=trackable_statuses
        ).distinct().select_related(
            'buyer', 'shipment', 'shipment__partner'
        ).order_by('-created_at')[:20]

        results = []
        for order in orders:
            shipment = getattr(order, 'shipment', None)
            entry = {
                'order_id': order.id,
                'order_status': order.status,
                'buyer': order.buyer.username,
                'total_amount': float(order.total_amount),
                'created_at': order.created_at.isoformat(),
            }
            if shipment:
                entry['shipment_id'] = shipment.id
                entry['shipment_status'] = shipment.status
                entry['driver_name'] = shipment.partner.name if shipment.partner else None
                entry['driver_assigned'] = shipment.partner is not None
                entry['pickup_address'] = shipment.pickup_address
                entry['delivery_address'] = shipment.delivery_address
                entry['distance_km'] = float(shipment.distance_km)
                if shipment.shipped_at:
                    entry['picked_up_at'] = shipment.shipped_at.isoformat()
                if shipment.delivered_at:
                    entry['delivered_at'] = shipment.delivered_at.isoformat()
            else:
                entry['shipment_status'] = 'no_shipment'
                entry['driver_name'] = None
                entry['driver_assigned'] = False

            results.append(entry)

        return results

    # ========== PLACEHOLDER TOOLS FOR FUTURE IMPLEMENTATION ==========

    def tool_find_buyers(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Find potential buyers for farmer's crops."""
        crop = args.get('crop') or 'crops'
        return {
            'message': f'Feature coming soon: Find buyers for {crop}',
            'status': 'not_implemented',
        }

    def tool_get_quote_requests(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get incoming quote requests from buyers."""
        return {
            'quote_requests': [],
            'message': 'No active quote requests at this time',
        }

    def tool_get_shipment_status(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get status of shipments/logistics for orders."""
        from logistics.models import DeliveryShipment

        if 'order_id' not in args or args['order_id'] is None:
            return {'error': 'order_id is required'}

        order_id = args['order_id']

        try:
            shipment = DeliveryShipment.objects.select_related('partner', 'order').get(order_id=order_id)
        except DeliveryShipment.DoesNotExist:
            return {
                'order_id': order_id,
                'status': 'no_shipment',
                'message': f'No shipment has been created for order #{order_id} yet. A shipment is created when the farmer confirms the order.',
            }

        result = {
            'order_id': order_id,
            'shipment_id': shipment.id,
            'shipment_status': shipment.status,
            'order_status': shipment.order.status,
            'pickup_address': shipment.pickup_address,
            'delivery_address': shipment.delivery_address,
            'distance_km': float(shipment.distance_km),
            'assigned_at': shipment.assigned_at.isoformat() if shipment.assigned_at else None,
        }

        if shipment.partner:
            result['driver_name'] = shipment.partner.name
            result['driver_assigned'] = True
        else:
            result['driver_name'] = None
            result['driver_assigned'] = False
            result['message'] = 'Shipment is broadcast to drivers. Waiting for a driver to accept.'

        if shipment.shipped_at:
            result['picked_up_at'] = shipment.shipped_at.isoformat()
        if shipment.delivered_at:
            result['delivered_at'] = shipment.delivered_at.isoformat()
        if shipment.handover_completed_at:
            result['handover_completed_at'] = shipment.handover_completed_at.isoformat()

        return result

    def tool_get_bulk_requirements(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get bulk requirements matching optional criteria.
        """
        from orders.models import BulkRequirement
        from products.models import Product
        
        crop = (args.get('crop') or '').lower()
        location = (args.get('location') or '').lower()
        
        query = BulkRequirement.objects.filter(status='pending')
        
        if crop:
            query = query.filter(crop_name__icontains=crop)
        if location:
            query = query.filter(location__icontains=location)
            
        requirements = query.order_by('-created_at')[:20]
        
        results = []
        for req in requirements:
            prod = Product.objects.filter(
                farmer=self.farmer_user,
                name__icontains=req.crop_name
            ).first()
            available_qty = float(prod.quantity) if prod else 0.0

            results.append({
                'id': req.id,
                'buyer': req.buyer.username,
                'crop_name': req.crop_name,
                'variety': req.variety,
                'quantity': float(req.quantity),
                'unit': req.unit,
                'grade': req.grade,
                'required_date': req.required_date.isoformat(),
                'target_price_min': float(req.target_price_min),
                'target_price_max': float(req.target_price_max),
                'location': req.location,
                'farmer_available_stock': available_qty,
            })
            
        return results

    def tool_create_farmer_offer(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new offer for a bulk requirement.
        """
        from orders.models import FarmerOffer, BulkRequirement
        from django.utils import timezone
        
        requirement_id = args.get('requirement_id')
        quantity = args.get('quantity')
        price_per_unit = args.get('price_per_unit')
        delivery_date_str = args.get('delivery_date')
        notes = args.get('notes') or ''
        
        if not requirement_id or not quantity or not price_per_unit or not delivery_date_str:
            return {'error': 'requirement_id, quantity, price_per_unit, and delivery_date are required'}
            
        try:
            requirement = BulkRequirement.objects.get(id=requirement_id)
        except BulkRequirement.DoesNotExist:
            return {'error': f'BulkRequirement with ID {requirement_id} does not exist'}
            
        try:
            from datetime import datetime
            delivery_date = datetime.fromisoformat(delivery_date_str).date()
        except ValueError:
            try:
                delivery_date = datetime.strptime(delivery_date_str, "%Y-%m-%d").date()
            except ValueError:
                # If date parsing fails, default to requirement date
                delivery_date = requirement.required_date
                
        offer = FarmerOffer.objects.create(
            requirement=requirement,
            farmer=self.farmer_user,
            quantity=quantity,
            price_per_unit=price_per_unit,
            delivery_date=delivery_date,
            notes=notes,
            status='pending'
        )
        
        return {
            'message': f'Successfully created offer for {quantity}kg of {requirement.crop_name} at Rs.{price_per_unit}/kg',
            'offer_id': offer.id,
            'requirement': requirement.crop_name,
            'status': offer.status
        }

    def tool_get_farmer_offers(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get all offers made by this farmer for bulk requirements.
        """
        from orders.models import FarmerOffer
        
        offers = FarmerOffer.objects.filter(farmer=self.farmer_user).order_by('-created_at')[:20]
        
        return [
            {
                'id': offer.id,
                'requirement_crop': offer.requirement.crop_name,
                'quantity': float(offer.quantity),
                'price_per_unit': float(offer.price_per_unit),
                'delivery_date': offer.delivery_date.isoformat(),
                'status': offer.status,
                'created_at': offer.created_at.isoformat(),
            }
            for offer in offers
        ]

    def tool_get_preharvest_contracts(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get all preharvest contracts involving this farmer.
        """
        from orders.models import PreHarvestContract
        
        contracts = PreHarvestContract.objects.filter(farmer=self.farmer_user).order_by('-created_at')[:20]
        
        return [
            {
                'id': contract.id,
                'crop_name': contract.crop_name,
                'buyer': contract.buyer.username if contract.buyer else 'Pending',
                'expected_harvest_date': contract.expected_harvest_date.isoformat(),
                'expected_quantity': float(contract.expected_quantity),
                'unit': contract.unit,
                'contract_price': float(contract.contract_price),
                'status': contract.status,
            }
            for contract in contracts
        ]

# Tool Definitions for Groq Function Calling
TOOL_DEFINITIONS = [
    {
        'type': 'function',
        'function': {
            'name': 'get_farmer_profile',
            'description': 'Get the current farmer\'s profile information including name, location, crops, and trust score',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_farmer_stats',
            'description': 'Get farmer\'s key statistics: active listings, pending orders, recent earnings, ratings, etc.',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_active_listings',
            'description': 'Get all of farmer\'s currently active product listings',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'create_listing',
            'description': 'Create a new product listing for selling produce',
            'parameters': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string', 'description': 'Product name (e.g., "Tomato", "Onion")'},
                    'category': {'type': 'string', 'enum': ['fruits', 'vegetables', 'grains', 'pulses', 'spices', 'others']},
                    'quantity': {'type': 'number', 'description': 'Quantity available'},
                    'unit': {'type': 'string', 'description': 'Unit (kg, quintal, ton, piece, etc.)'},
                    'price_per_unit': {'type': 'number', 'description': 'Price per unit in rupees'},
                    'harvest_date': {'type': ['string', 'null'], 'description': 'Harvest date (ISO format: YYYY-MM-DD)'},
                    'expiry_date': {'type': 'string', 'description': 'Expiry/best before date (ISO format: YYYY-MM-DD)'},
                    'description': {'type': ['string', 'null'], 'description': 'Product description (optional)'},
                },
                'required': ['name', 'category', 'quantity', 'unit', 'price_per_unit', 'expiry_date'],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'update_listing',
            'description': 'Update an existing product listing (price, quantity, description). Can look up by ID or crop name.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'product_id': {'type': ['integer', 'string', 'null'], 'description': 'ID of the product to update (optional if crop_name is provided)'},
                    'crop_name': {'type': ['string', 'null'], 'description': 'Name of the crop or listing to update'},
                    'price_per_unit': {'type': ['number', 'null'], 'description': 'New price per unit (optional)'},
                    'quantity': {'type': ['number', 'null'], 'description': 'New quantity available (optional)'},
                    'description': {'type': ['string', 'null'], 'description': 'Updated description (optional)'},
                },
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'delete_listing',
            'description': 'Delete an existing product listing belonging to the farmer.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'product_id': {'type': ['integer', 'string', 'null'], 'description': 'ID of the product to delete'},
                    'crop_name': {'type': ['string', 'null'], 'description': 'Name of the crop to delete if ID is unknown'},
                },
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_farmer_orders',
            'description': 'Get all orders belonging to the authenticated farmer (including placed, confirmed, packed, in_transit, delivered) with live real-time status and driver info.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'status': {'type': ['string', 'null'], 'description': 'Optional status filter (placed, confirmed, packed, in_transit, delivered)'},
                },
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_pending_orders',
            'description': 'Get list of active/pending/in-transit orders that need farmer\'s attention',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_order_details',
            'description': 'Get detailed information about a specific order',
            'parameters': {
                'type': 'object',
                'properties': {
                    'order_id': {'type': 'integer', 'description': 'Order ID'},
                },
                'required': ['order_id'],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_market_prices',
            'description': 'Get current market prices for a specific crop in a location',
            'parameters': {
                'type': 'object',
                'properties': {
                    'crop': {'type': 'string', 'description': 'Crop name (e.g., "tomato", "onion")'},
                    'location': {'type': ['string', 'null'], 'description': 'Location/market (optional)'},
                },
                'required': ['crop'],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_price_recommendation',
            'description': 'Get a recommended selling price based on market data and product details',
            'parameters': {
                'type': 'object',
                'properties': {
                    'crop': {'type': 'string', 'description': 'Crop name'},
                    'quantity': {'type': ['number', 'null'], 'description': 'Quantity available (optional)'},
                    'location': {'type': ['string', 'null'], 'description': 'Location (optional)'},
                },
                'required': ['crop'],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'find_buyers',
            'description': 'Find potential buyers for your crops',
            'parameters': {
                'type': 'object',
                'properties': {
                    'crop': {'type': 'string', 'description': 'Crop name'},
                    'quantity': {'type': ['number', 'null'], 'description': 'Quantity available (optional)'},
                },
                'required': ['crop'],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_quote_requests',
            'description': 'Get incoming quote requests from buyers',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_shipment_status',
            'description': 'Get the current shipment/logistics status for an order',
            'parameters': {
                'type': 'object',
                'properties': {
                    'order_id': {'type': 'integer', 'description': 'Order ID'},
                },
                'required': ['order_id'],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_trackable_shipments',
            'description': 'Get all orders with active/trackable shipments (packed, in_transit) for the farmer. Used to check which shipments are currently in progress.',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_bulk_requirements',
            'description': 'Search for pending bulk requirements posted by buyers. Returns a list of bulk requests.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'crop': {'type': ['string', 'null'], 'description': 'Filter by crop name (optional)'},
                    'location': {'type': ['string', 'null'], 'description': 'Filter by location (optional)'},
                },
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_farmer_offers',
            'description': 'Get all offers/counter-offers made by the farmer to bulk requirements.',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_preharvest_contracts',
            'description': 'Get all preharvest contracts involving the farmer.',
            'parameters': {
                'type': 'object',
                'properties': {},
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'create_farmer_offer',
            'description': 'Create an offer from the farmer for a specific bulk requirement.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'requirement_id': {'type': 'integer', 'description': 'The ID of the bulk requirement'},
                    'quantity': {'type': 'number', 'description': 'The quantity the farmer is offering (e.g. 300)'},
                    'price_per_unit': {'type': 'number', 'description': 'The price per unit offered (e.g. 19)'},
                    'delivery_date': {'type': 'string', 'description': 'The expected delivery date (YYYY-MM-DD)'},
                    'notes': {'type': ['string', 'null'], 'description': 'Any additional notes (optional)'}
                },
                'required': ['requirement_id', 'quantity', 'price_per_unit', 'delivery_date'],
            }
        }
    },
]
