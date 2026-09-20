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
            
            # Get active listings (matching Crop Inventory active listings criteria)
            active_listings = sum(
                1 for p in Product.objects.filter(
                    farmer=self.farmer_user,
                    expiry_date__gte=timezone.now().date()
                )
                if p.stored_in_cold_storage or p.freshness_percentage != 0
            )

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

        all_listings = Product.objects.filter(
            farmer=self.farmer_user,
            expiry_date__gte=timezone.now().date()
        ).order_by('-created_at')

        # Only include active listings (match Crop Inventory: exclude items where freshness reached 0% unless in cold storage)
        listings = [
            p for p in all_listings
            if p.stored_in_cold_storage or p.freshness_percentage != 0
        ][:20]  # Limit to 20 recent active listings

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
                'stored_in_cold_storage': listing.stored_in_cold_storage,
                'storage_type': 'Cold Storage' if listing.stored_in_cold_storage else 'Standard Storage',
                'freshness': 'Cold Storage' if listing.stored_in_cold_storage else (f"{listing.freshness_percentage}%" if listing.freshness_percentage is not None else 'N/A'),
                'freshness_percentage': listing.freshness_percentage,
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
            active = [
                p for p in Product.objects.filter(farmer=self.farmer_user, expiry_date__gte=timezone.now().date())
                if p.stored_in_cold_storage or p.freshness_percentage != 0
            ]
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
            active = [
                p for p in Product.objects.filter(farmer=self.farmer_user, expiry_date__gte=timezone.now().date())
                if p.stored_in_cold_storage or p.freshness_percentage != 0
            ]
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
        """Get all orders belonging to the farmer with real-time status, crops ordered, and driver info."""
        from orders.models import Order

        status_filter = args.get('status')
        queryset = Order.objects.filter(
            items__product__farmer=self.farmer_user
        ).distinct().select_related(
            'buyer', 'shipment', 'shipment__partner'
        ).prefetch_related('items__product').order_by('-created_at')

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        orders = queryset[:25]

        results = []
        for order in orders:
            shipment = getattr(order, 'shipment', None)
            order_items = []
            crops_list = []
            my_earnings = 0.0
            for it in order.items.all():
                crop_name = it.product.name if it.product else 'Unknown Crop'
                unit = it.product.unit if it.product else 'kg'
                qty = float(it.quantity)
                price = float(it.price)
                is_mine = (it.product and it.product.farmer_id == self.farmer_user.id)
                if is_mine:
                    my_earnings += qty * price
                order_items.append({
                    'crop_name': crop_name,
                    'quantity': qty,
                    'unit': unit,
                    'price_per_unit': price,
                    'subtotal': qty * price,
                    'is_my_crop': is_mine,
                })
                crops_list.append(f"{qty} {unit} {crop_name}")

            buyer_full_name = f"{order.buyer.first_name} {order.buyer.last_name}".strip() or order.buyer.username

            results.append({
                'id': order.id,
                'status': order.status,
                'crops_ordered': crops_list,
                'crops_summary': ", ".join(crops_list),
                'items': order_items,
                'farmer_earnings': my_earnings,
                'product_subtotal': float(order.product_subtotal),
                'shipping_charge': float(order.shipping_charge),
                'total_amount': float(order.total_amount),
                'payment_status': order.payment_status,
                'created_at': order.created_at.strftime('%Y-%m-%d %H:%M'),
                'buyer': order.buyer.username,
                'buyer_name': buyer_full_name,
                'buyer_phone': getattr(order.buyer, 'phone', None),
                'shipping_address': order.shipping_address,
                'shipping_pincode': order.shipping_pincode,
                'shipment_status': shipment.status if shipment else 'no_shipment',
                'driver_name': shipment.partner.name if (shipment and shipment.partner) else None,
                'driver_phone': shipment.partner.phone if (shipment and shipment.partner) else None,
                'allowed_actions': (
                    ['confirm', 'cancel'] if order.status == 'placed' else
                    ['pack', 'cancel'] if order.status == 'confirmed' else []
                ),
            })
        return results

    def tool_get_pending_orders(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get active/pending/in-transit orders belonging to this farmer with full crop details."""
        from orders.models import Order

        orders = Order.objects.filter(
            items__product__farmer=self.farmer_user,
            status__in=['placed', 'confirmed', 'packed', 'in_transit']
        ).distinct().select_related(
            'buyer', 'shipment', 'shipment__partner'
        ).prefetch_related('items__product').order_by('-created_at')[:20]

        results = []
        for order in orders:
            shipment = getattr(order, 'shipment', None)
            order_items = []
            crops_list = []
            my_earnings = 0.0
            for it in order.items.all():
                crop_name = it.product.name if it.product else 'Unknown Crop'
                unit = it.product.unit if it.product else 'kg'
                qty = float(it.quantity)
                price = float(it.price)
                is_mine = (it.product and it.product.farmer_id == self.farmer_user.id)
                if is_mine:
                    my_earnings += qty * price
                order_items.append({
                    'crop_name': crop_name,
                    'quantity': qty,
                    'unit': unit,
                    'price_per_unit': price,
                    'subtotal': qty * price,
                    'is_my_crop': is_mine,
                })
                crops_list.append(f"{qty} {unit} {crop_name}")

            buyer_full_name = f"{order.buyer.first_name} {order.buyer.last_name}".strip() or order.buyer.username

            results.append({
                'id': order.id,
                'status': order.status,
                'crops_ordered': crops_list,
                'crops_summary': ", ".join(crops_list),
                'items': order_items,
                'farmer_earnings': my_earnings,
                'product_subtotal': float(order.product_subtotal),
                'shipping_charge': float(order.shipping_charge),
                'total_amount': float(order.total_amount),
                'payment_status': order.payment_status,
                'created_at': order.created_at.strftime('%Y-%m-%d %H:%M'),
                'buyer': order.buyer.username,
                'buyer_name': buyer_full_name,
                'buyer_phone': getattr(order.buyer, 'phone', None),
                'shipping_address': order.shipping_address,
                'shipping_pincode': order.shipping_pincode,
                'shipment_status': shipment.status if shipment else 'no_shipment',
                'driver_name': shipment.partner.name if (shipment and shipment.partner) else None,
                'driver_phone': shipment.partner.phone if (shipment and shipment.partner) else None,
                'allowed_actions': (
                    ['confirm', 'cancel'] if order.status == 'placed' else
                    ['pack', 'cancel'] if order.status == 'confirmed' else []
                ),
            })
        return results

    def tool_get_order_details(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Get complete real-time information about a specific retail order including all ordered crops."""
        from orders.models import Order
        from logistics.models import TransportOffer

        raw_id = args.get('order_id')
        if raw_id is None:
            return {'error': 'order_id is required'}

        try:
            order_id = int(raw_id)
        except (ValueError, TypeError):
            return {'error': f'Invalid order_id: {raw_id}'}

        try:
            # Query order safely with distinct to avoid MultipleObjectsReturned join issue
            order = Order.objects.filter(
                id=order_id,
                items__product__farmer=self.farmer_user
            ).distinct().select_related(
                'buyer', 'shipment', 'shipment__partner'
            ).prefetch_related('items__product').first()

            if not order:
                if Order.objects.filter(id=order_id).exists():
                    return {'error': f'Order #{order_id} does not contain any of your crops'}
                return {'error': f'Order #{order_id} not found'}

            shipment = getattr(order, 'shipment', None)
            buyer_full_name = f"{order.buyer.first_name} {order.buyer.last_name}".strip() or order.buyer.username

            items_list = []
            crops_summary = []
            farmer_earnings = 0.0
            for item in order.items.all():
                is_my_crop = (item.product and item.product.farmer_id == self.farmer_user.id)
                crop_name = item.product.name if item.product else 'Unknown Crop'
                unit = item.product.unit if item.product else 'kg'
                qty = float(item.quantity)
                price = float(item.price)
                subtotal = qty * price
                if is_my_crop:
                    farmer_earnings += subtotal
                item_data = {
                    'item_id': item.id,
                    'product_id': item.product_id,
                    'crop_name': crop_name,
                    'category': item.product.category if item.product else 'produce',
                    'quantity': qty,
                    'unit': unit,
                    'price_per_unit': price,
                    'subtotal': subtotal,
                    'is_my_crop': is_my_crop,
                }
                items_list.append(item_data)
                crops_summary.append(f"{qty} {unit} {crop_name} (@ Rs.{price}/{unit} = Rs.{subtotal})")

            res = {
                'id': order.id,
                'status': order.status,
                'crops_ordered': crops_summary,
                'items': items_list,
                'farmer_earnings_from_order': farmer_earnings,
                'product_subtotal': float(order.product_subtotal),
                'shipping_charge': float(order.shipping_charge),
                'total_amount': float(order.total_amount),
                'payment_status': order.payment_status,
                'payment_id': order.payment_id,
                'created_at': order.created_at.isoformat(),
                'placed_date': order.created_at.strftime('%d %B %Y, %I:%M %p'),
                'updated_at': order.updated_at.isoformat(),
                'buyer': {
                    'username': order.buyer.username,
                    'name': buyer_full_name,
                    'phone': getattr(order.buyer, 'phone', None),
                    'email': order.buyer.email,
                },
                'shipping_address': order.shipping_address,
                'shipping_pincode': order.shipping_pincode,
                'cancellation_locked': order.cancellation_locked,
                'cancellation_reason': order.cancellation_reason,
                'allowed_actions': (
                    ['confirm', 'cancel'] if order.status == 'placed' else
                    ['pack', 'cancel'] if order.status == 'confirmed' else []
                ),
            }

            if shipment:
                res['shipment'] = {
                    'id': shipment.id,
                    'status': shipment.status,
                    'pickup_address': shipment.pickup_address,
                    'delivery_address': shipment.delivery_address,
                    'distance_km': float(shipment.distance_km),
                    'driver_name': shipment.partner.name if shipment.partner else None,
                    'driver_phone': shipment.partner.phone if shipment.partner else None,
                    'driver_district': shipment.partner.district if shipment.partner else None,
                    'delivery_otp': shipment.delivery_otp,
                    'assigned_at': shipment.assigned_at.isoformat() if shipment.assigned_at else None,
                    'shipped_at': shipment.shipped_at.isoformat() if shipment.shipped_at else None,
                    'delivered_at': shipment.delivered_at.isoformat() if shipment.delivered_at else None,
                }
                res['shipment_status'] = shipment.status
                res['driver_name'] = shipment.partner.name if shipment.partner else None
                res['driver_phone'] = shipment.partner.phone if shipment.partner else None
                res['delivery_otp'] = shipment.delivery_otp
            else:
                res['shipment'] = None
                res['shipment_status'] = 'no_shipment'

            # Check if there is an offer pending acceptance by a driver
            pending_offer = TransportOffer.objects.filter(shipment__order=order, status='pending').select_related('partner').first()
            if pending_offer and pending_offer.partner:
                res['pending_transport_offer'] = {
                    'driver_name': pending_offer.partner.name,
                    'driver_phone': pending_offer.partner.phone,
                    'message': 'Trip broadcast offered to driver, waiting for acceptance',
                }

            return res
        except Exception as e:
            logger.error(f"Error fetching order {args.get('order_id')}: {str(e)}")
            return {'error': f'Failed to fetch order details: {str(e)}'}

    def tool_update_order_status(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update the status of an order (confirm, pack, or cancel).
        Args:
            order_id (int): ID of the order to update
            status (str): Target status ('confirmed', 'packed', or 'cancelled')
            reason (str, optional): Cancellation reason if cancelling
        """
        from orders.models import Order
        from products.models import Product
        from django.db import transaction

        order_id = args.get('order_id')
        new_status = (args.get('status') or '').strip().lower()
        reason = args.get('reason') or 'Cancelled by farmer via Assistant'

        if not order_id or not new_status:
            return {'error': 'order_id and status are required'}

        try:
            order_id = int(order_id)
        except (ValueError, TypeError):
            return {'error': f'Invalid order_id: {order_id}'}

        valid_statuses = ['confirmed', 'packed', 'cancelled']
        if new_status not in valid_statuses:
            return {'error': f"Invalid status '{new_status}'. Allowed values for farmers: {', '.join(valid_statuses)}"}

        try:
            with transaction.atomic():
                order = Order.objects.filter(
                    id=order_id,
                    items__product__farmer=self.farmer_user
                ).distinct().select_for_update().first()

                if not order:
                    return {'error': f'Order #{order_id} not found or does not belong to you'}

                farmer_allowed = {
                    'placed': ['confirmed', 'cancelled'],
                    'confirmed': ['packed', 'cancelled'],
                }
                allowed_next = farmer_allowed.get(order.status, [])
                if new_status not in allowed_next:
                    return {
                        'error': f'Cannot move Order #{order_id} from "{order.status}" to "{new_status}". Allowed transitions from "{order.status}": {allowed_next if allowed_next else "None (handled by logistics partner)"}'
                    }

                if new_status == 'confirmed':
                    order_items = list(order.items.select_related('product').all())
                    locked_products = {}
                    for item in order_items:
                        product = Product.objects.select_for_update().get(pk=item.product_id)
                        if product.farmer_id != self.farmer_user.id:
                            return {'error': 'You can only confirm your own products.'}
                        locked_products[product.id] = product

                    insufficient = next(
                        (item for item in order_items if locked_products[item.product_id].quantity < item.quantity),
                        None,
                    )
                    if insufficient:
                        order.status = 'cancelled'
                        order.cancellation_reason = (
                            f'Order cancelled because {insufficient.product.name} inventory ran out before confirmation.'
                        )
                        order.save(update_fields=['status', 'cancellation_reason', 'updated_at'])
                        return {
                            'error': order.cancellation_reason,
                            'order_id': order.id,
                            'status': 'cancelled'
                        }

                    for item in order_items:
                        product = locked_products[item.product_id]
                        product.quantity -= item.quantity
                        product.save(update_fields=['quantity'])

                    # Handle competing orders
                    competing_orders = Order.objects.filter(
                        status='placed',
                        items__product_id__in=locked_products.keys(),
                    ).exclude(pk=order.pk).distinct()
                    for competing in competing_orders.prefetch_related('items__product'):
                        for item in competing.items.all():
                            product = locked_products.get(item.product_id)
                            if product and product.quantity < item.quantity:
                                competing.status = 'cancelled'
                                competing.cancellation_reason = f'Cancelled because stock for {product.name} was confirmed for Order #{order.id}'
                                competing.save(update_fields=['status', 'cancellation_reason', 'updated_at'])

                    order.status = 'confirmed'
                    order.save(update_fields=['status', 'updated_at'])
                    return {
                        'message': f'Order #{order.id} has been confirmed successfully! Inventory has been updated.',
                        'order_id': order.id,
                        'new_status': 'confirmed'
                    }

                elif new_status == 'packed':
                    order.status = 'packed'
                    order.save(update_fields=['status', 'updated_at'])
                    return {
                        'message': f'Order #{order.id} is now marked as packed. Logistics pickup will be dispatched.',
                        'order_id': order.id,
                        'new_status': 'packed'
                    }

                elif new_status == 'cancelled':
                    # If previously confirmed, restore stock
                    if order.status == 'confirmed':
                        for item in order.items.select_related('product').all():
                            if item.product and item.product.farmer_id == self.farmer_user.id:
                                item.product.quantity += item.quantity
                                item.product.save(update_fields=['quantity'])

                    order.status = 'cancelled'
                    order.cancellation_reason = reason
                    order.save(update_fields=['status', 'cancellation_reason', 'updated_at'])
                    return {
                        'message': f'Order #{order.id} has been cancelled.',
                        'order_id': order.id,
                        'new_status': 'cancelled',
                        'reason': reason
                    }

        except Exception as e:
            logger.error(f"Error updating order status: {str(e)}")
            return {'error': f'Failed to update order status: {str(e)}'}

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
                response = requests.get(url, params=params, timeout=3)
                response.raise_for_status()
                data = response.json()
                records = data.get("records", [])
            except Exception as e:
                logger.error(f"AGMARKNET API call failed: {e}")
        
        if not records:
            # Fallback to mock data if API fails or returns no records
            from pricing.services import MOCK_AGMARKNET_DATA
            import re
            
            mock_records = MOCK_AGMARKNET_DATA["records"]
            clean_tokens = [
                w for w in re.findall(r'[a-z]+', crop.lower())
                if w not in {'aged', 'raw', 'fresh', 'organic', 'traditional', 'grade', 'a', 'b', 'c', '1121', 'stemless'}
                and len(w) > 2
            ]

            records = [
                r for r in mock_records 
                if (clean_tokens and any(w in r.get("commodity", "").lower() or r.get("commodity", "").lower() in w for w in clean_tokens))
                or crop.lower() in r.get("commodity", "").lower()
            ]
            
            if location:
                loc_records = [
                    r for r in records
                    if location.lower() in r.get("district", "").lower() or 
                       location.lower() in r.get("market", "").lower()
                ]
                if loc_records:
                    records = loc_records
            
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
        """
        Get ALL incoming wholesale bids / quote requests received by the farmer from buyers.
        This maps to the "Wholesale Bids" section in the UI.
        Returns bids of ALL statuses (pending, offered, accepted, rejected).
        """
        from orders.models import QuoteRequest

        status_filter = (args.get('status') or '').strip().lower()

        qs = QuoteRequest.objects.filter(
            product__farmer=self.farmer_user
        ).select_related('buyer', 'product').order_by('-created_at')[:20]

        if status_filter:
            qs = qs.filter(status=status_filter)

        if not qs.exists():
            return {
                'quote_requests': [],
                'message': 'No wholesale bids received yet.',
            }

        results = []
        for q in qs:
            results.append({
                'id': q.id,
                'buyer': q.buyer.username if q.buyer else 'Buyer',
                'buyer_name': (q.buyer.get_full_name() or q.buyer.username) if q.buyer else 'Buyer',
                'product_id': q.product.id if q.product else None,
                'product_name': q.product.name if q.product else 'Crop',
                'requested_quantity': float(q.quantity),
                'buyers_bid_price': float(q.target_price),   # What buyer offered to pay
                'your_counter_price': float(q.offered_price) if q.offered_price else None,  # Farmer's counter
                'status': q.status,  # pending/offered/accepted/rejected
                'created_at': q.created_at.isoformat(),
                'note': (
                    'Contract Locked — ACCEPTED' if q.status == 'accepted' else
                    f'Awaiting buyer response to your counter of ₹{q.offered_price}/unit' if q.status == 'offered' else
                    'Awaiting your response' if q.status == 'pending' else
                    q.status.capitalize()
                ),
            })

        return {
            'quote_requests': results,
            'count': len(results),
            'message': f'Found {len(results)} wholesale bids in total.',
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
        import re
        def _get_crop_tokens(val):
            ignored = {'fresh', 'organic', 'premium', 'natural', 'local', 'standard', 'grade', 'quality', 'a', 'b', 'c', 'raw'}
            tokens = set()
            for token in re.findall(r'[a-z0-9]+', (val or '').lower()):
                if token in ignored or len(token) < 2:
                    continue
                if token.endswith('ies') and len(token) > 4:
                    token = f'{token[:-3]}y'
                elif token.endswith('es') and len(token) > 4:
                    token = token[:-2]
                elif token.endswith('s') and not token.endswith('ss') and len(token) > 3:
                    token = token[:-1]
                tokens.add(token)
            return tokens

        farmer_prods = list(Product.objects.filter(farmer=self.farmer_user, quantity__gt=0))

        for req in requirements:
            req_tokens = _get_crop_tokens(req.crop_name)
            matching_prod = None
            for p in farmer_prods:
                p_tokens = _get_crop_tokens(p.name)
                if req_tokens and req_tokens.issubset(p_tokens):
                    matching_prod = p
                    break
            available_qty = float(matching_prod.quantity) if matching_prod else 0.0

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

    def tool_get_farmer_offers(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get all sourcing contributions (FarmerOffers) made by this farmer for reverse-marketplace
        bulk pool demands (BulkRequirements). This maps to the "Sourcing Contributions" panel
        in the Reverse Marketplace / Wholesale Buying Demands UI.
        Each entry includes full context of the pool requirement the farmer bid into.
        """
        from orders.models import FarmerOffer

        offers = FarmerOffer.objects.filter(
            farmer=self.farmer_user
        ).select_related('requirement', 'requirement__buyer').order_by('-created_at')[:20]

        if not offers.exists():
            return {
                'sourcing_contributions': [],
                'message': 'You have not submitted any sourcing contributions yet.',
            }

        results = []
        for offer in offers:
            req = offer.requirement
            results.append({
                'contribution_id': offer.id,
                'pool_requirement_id': req.id,
                'pool_label': f'Pool Requirement #{req.id}',
                'crop_name': req.crop_name,
                'variety': req.variety,
                # Pool (BulkRequirement) details
                'pool_total_quantity': float(req.quantity),
                'pool_unit': req.unit,
                'pool_target_price_range': f'₹{req.target_price_min}–₹{req.target_price_max}/{req.unit}',
                'pool_target_price_min': float(req.target_price_min),
                'pool_target_price_max': float(req.target_price_max),
                'pool_required_date': req.required_date.isoformat(),
                'pool_delivery_location': req.location,
                'pool_buyer': req.buyer.username if req.buyer else 'Buyer',
                'pool_status': req.status,
                # This farmer's contribution
                'your_offered_quantity': float(offer.quantity),
                'your_bid_rate': float(offer.price_per_unit),
                'your_deliver_date': offer.delivery_date.isoformat(),
                'your_contribution_status': offer.status,  # pending/accepted/rejected/countered
                'notes': offer.notes or '',
                'submitted_at': offer.created_at.isoformat(),
            })

        return {
            'sourcing_contributions': results,
            'count': len(results),
            'message': (
                f'You have {len(results)} sourcing contribution(s) in the Reverse Marketplace. '
                'Each shows your bid into a bulk buyer pool.'
            ),
        }

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
            'description': 'Get all retail orders belonging to the authenticated farmer with full details: ordered crops, quantities, subtotal, earnings, buyer info, live status, and logistics driver info.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'status': {'type': ['string', 'null'], 'description': 'Optional status filter: placed, confirmed, packed, in_transit, delivered, cancelled'},
                },
                'required': [],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_pending_orders',
            'description': 'Get active/pending/in-transit retail orders that need farmer action (to confirm or pack), including crops ordered, quantities, buyer info, and current status.',
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
            'description': 'Get complete detailed real-time information about a specific retail order by its order ID: all crops ordered, quantities, prices, subtotals, farmer earnings, buyer contact, delivery address, live shipment tracking, driver details, and allowed actions.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'order_id': {'type': 'integer', 'description': 'The numeric order ID (e.g., 15)'},
                },
                'required': ['order_id'],
            }
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'update_order_status',
            'description': 'Update the status of an order: confirm a placed order, mark a confirmed order as packed, or cancel an order. Farmers can only execute allowed transitions: placed -> confirmed or cancelled; confirmed -> packed or cancelled.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'order_id': {'type': 'integer', 'description': 'The ID of the order to update'},
                    'status': {'type': 'string', 'enum': ['confirmed', 'packed', 'cancelled'], 'description': 'The new status to set'},
                    'reason': {'type': ['string', 'null'], 'description': 'Optional reason if cancelling'},
                },
                'required': ['order_id', 'status'],
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
            'description': (
                'Get wholesale bids received from buyers for this farmer\'s crop listings. '
                'This maps to the "Wholesale Bids" (WHOLESALE CHANNEL) section in the UI. '
                'Returns bids with buyer name, crop, requested quantity, buyer\'s bid price, '
                'farmer\'s counter price, and current status (pending/offered/accepted/rejected). '
                'Use this tool when the farmer asks about their wholesale bids, quote requests, or direct buyer negotiations.'
            ),
            'parameters': {
                'type': 'object',
                'properties': {
                    'status': {
                        'type': ['string', 'null'],
                        'description': 'Filter by bid status: pending, offered, accepted, or rejected. Leave null for all.',
                        'enum': ['pending', 'offered', 'accepted', 'rejected', None],
                    },
                },
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
            'description': (
                'Get the farmer\'s sourcing contributions to reverse-marketplace bulk pool demands. '
                'This maps to the "Sourcing Contributions" panel in the "Wholesale Buying Demands" '
                '(Reverse Marketplace) UI. Each contribution shows which pool (BulkRequirement) the '
                'farmer bid into, the pool\'s total quantity, price range, delivery location, and the '
                'farmer\'s own bid quantity, bid rate, and current status (pending/accepted/countered/rejected). '
                'Use this tool when the farmer asks about their reverse marketplace bids, sourcing contributions, or pool requirements.'
            ),
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
