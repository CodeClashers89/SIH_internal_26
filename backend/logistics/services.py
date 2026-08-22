from .models import LogisticsPartner, DeliveryShipment
from django.db.models import Count, Q
from decimal import Decimal
import random


def create_open_shipment(order):
    """
    Rapido-style open broadcast shipment creation.

    Instead of auto-assigning a driver, we create the shipment with NO partner.
    All active logistics partner users in the area can see it and RACE to accept.
    The first driver to accept (via atomic select_for_update) wins the job.

    Distance is calculated using a rule-based pincode/district heuristic:
      - Same pincode  → 2–5 km
      - Same district → 10–25 km
      - Different     → 50–120 km
    """
    farmer = None
    first_item = order.items.first()
    if first_item and first_item.product:
        farmer = first_item.product.farmer

    if not farmer:
        print(f"[LOGISTICS] Cannot create shipment for order #{order.id}: no farmer found.")
        return None

    farmer_district = (farmer.district or "").strip()
    farmer_pincode = (farmer.pincode or "").strip()
    order_district = (order.buyer.district or "").strip()
    order_pincode = (order.shipping_pincode or "").strip()

    # Distance heuristic
    if farmer_pincode and farmer_pincode == order_pincode:
        distance = Decimal(round(random.uniform(2.0, 5.0), 2))
    elif farmer_district and farmer_district.lower() == order_district.lower():
        distance = Decimal(round(random.uniform(10.0, 25.0), 2))
    else:
        distance = Decimal(round(random.uniform(50.0, 120.0), 2))

    # Build human-readable addresses
    pickup_addr = (farmer.address or f"{farmer.district or 'Farmer'}, {farmer.pincode or ''}").strip(", ")
    delivery_addr = (order.shipping_address or f"{order.buyer.district or ''}, {order_pincode}").strip(", ")

    from route_planning.services.geocoding import geocode_city
    p_coords = geocode_city(farmer.district or pickup_addr) or (22.5645, 72.9289)
    d_coords = geocode_city(order.buyer.district or order.shipping_address) or (19.0760, 72.8777)

    # Create open shipment — partner=None means it's broadcast to all drivers
    shipment, created = DeliveryShipment.objects.get_or_create(
        order=order,
        defaults={
            'partner': None,          # ← Open job, no driver assigned yet
            'pickup_address': pickup_addr,
            'delivery_address': delivery_addr,
            'pickup_lat': p_coords[0],
            'pickup_lng': p_coords[1],
            'destination_lat': d_coords[0],
            'destination_lng': d_coords[1],
            'distance_km': distance,
            'status': 'assigned',     # 'assigned' status means waiting for driver pickup
        }
    )

    if not created:
        # Already exists — reset to open if it had a phantom partner
        if shipment.partner and shipment.partner.user is None:
            shipment.partner = None
            shipment.pickup_address = pickup_addr
            shipment.delivery_address = delivery_addr
            shipment.distance_km = distance
            shipment.save()
            print(f"[LOGISTICS] Reset phantom-assigned shipment #{shipment.id} to open for order #{order.id}")
        else:
            print(f"[LOGISTICS] Shipment #{shipment.id} already exists for order #{order.id} (partner={shipment.partner_id})")
    else:
        print(f"[LOGISTICS] Open shipment #{shipment.id} broadcast for order #{order.id} | {distance} km | Waiting for driver acceptance.")

    return shipment


# Keep old name as alias so existing imports don't break
assign_delivery_partner = create_open_shipment
