from .models import LogisticsPartner, DeliveryShipment
from django.db.models import Count, Q
from decimal import Decimal
import random

def assign_delivery_partner(order):
    """
    Rule-based logistics partner assignment:
    1. Retrieve the farmer's (pickup) pincode & district, and the order's (delivery) pincode & district.
    2. Query active logistics partners.
    3. Try to find partners in the farmer's district (to facilitate easy pickup).
    4. If multiple partners found, select the one with the fewest active (non-delivered) shipments.
    5. Calculate distance using a simple lookup:
       - Same pincode: 2-5 km
       - Same district: 10-25 km
       - Different district: 50-120 km
    """
    farmer = None
    # Find the farmer of the first item in the order
    first_item = order.items.first()
    if first_item and first_item.product:
        farmer = first_item.product.farmer

    if not farmer:
        return None

    farmer_district = farmer.district or ""
    farmer_pincode = farmer.pincode or ""
    order_district = order.buyer.district or ""
    order_pincode = order.shipping_pincode or ""

    # Try to find partners matching the farmer's district first, then pincode, then any active partner
    partners = LogisticsPartner.objects.filter(active=True)
    
    district_partners = partners.filter(district__iexact=farmer_district)
    if district_partners.exists():
        selected_partners = district_partners
    else:
        pincode_partners = partners.filter(pincode=farmer_pincode)
        if pincode_partners.exists():
            selected_partners = pincode_partners
        else:
            selected_partners = partners

    # If no partners exist in system at all, return None
    if not selected_partners.exists():
        return None

    # Load balancing: Select the partner with the least active delivery shipments
    partner_scores = selected_partners.annotate(
        active_shipments_count=Count(
            'shipments', 
            filter=~Q(shipments__status='delivered')
        )
    ).order_by('active_shipments_count')

    assigned_partner = partner_scores.first()

    # Rule-based distance calculation
    if farmer_pincode == order_pincode:
        distance = Decimal(round(random.uniform(2.0, 5.0), 2))
    elif farmer_district.lower() == order_district.lower():
        distance = Decimal(round(random.uniform(10.0, 25.0), 2))
    else:
        distance = Decimal(round(random.uniform(50.0, 120.0), 2))

    # Create shipment record
    shipment, created = DeliveryShipment.objects.get_or_create(
        order=order,
        defaults={
            'partner': assigned_partner,
            'pickup_address': farmer.address or "Farmer Location",
            'delivery_address': order.shipping_address,
            'distance_km': distance,
            'status': 'assigned'
        }
    )
    if not created:
        shipment.partner = assigned_partner
        shipment.pickup_address = farmer.address or "Farmer Location"
        shipment.delivery_address = order.shipping_address
        shipment.distance_km = distance
        shipment.save()

    return shipment
