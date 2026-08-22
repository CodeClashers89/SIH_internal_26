from django.utils import timezone
from .models import ControlTowerException, OperationalEvent, SLADefinition
from orders.models import Order
from logistics.models import DeliveryShipment

class ControlTowerEngine:
    @staticmethod
    def run_checks():
        ControlTowerEngine.check_orders()
        ControlTowerEngine.check_shipments()

    @staticmethod
    def check_orders():
        # Check active orders
        active_orders = Order.objects.exclude(status__in=['delivered', 'cancelled'])
        
        for order in active_orders:
            # Fake/stub rules for demonstration of deterministic logic based on DB models
            
            # Rule 1: Payment Overdue
            # if order.payment_status == 'failed' ...
            if hasattr(order, 'payment_status') and order.payment_status == 'failed':
                ControlTowerEngine.raise_exception(
                    type="PAYMENT_DISPUTE",
                    severity="HIGH",
                    entity_type="Order",
                    entity_id=str(order.id),
                    title=f"Payment failed for Order #{order.id}",
                    description=f"The payment for order #{order.id} failed. Requires immediate attention."
                )
                
            # Note: order model doesn't have required_quantity/confirmed_quantity fields directly (only OrderItem), 
            # so for this MVP we demonstrate simple status-based logic.

    @staticmethod
    def check_shipments():
        active_shipments = DeliveryShipment.objects.exclude(status='delivered')
        
        for shipment in active_shipments:
            # Rule 2: Vehicle Unavailable
            if not shipment.partner:
                ControlTowerEngine.raise_exception(
                    type="VEHICLE_UNAVAILABLE",
                    severity="CRITICAL",
                    entity_type="Shipment",
                    entity_id=str(shipment.id),
                    title=f"Shipment #{shipment.id} lacks a vehicle",
                    description=f"Shipment #{shipment.id} for Order #{shipment.order.id} is unassigned."
                )
            
            # Rule 3: Delivery Delay
            if shipment.estimated_delivery_date and shipment.estimated_delivery_date < timezone.now().date():
                ControlTowerEngine.raise_exception(
                    type="DELIVERY_DELAY",
                    severity="HIGH",
                    entity_type="Shipment",
                    entity_id=str(shipment.id),
                    title=f"Shipment #{shipment.id} is delayed",
                    description=f"Shipment was expected on {shipment.estimated_delivery_date}."
                )

    @staticmethod
    def raise_exception(type, severity, entity_type, entity_id, title, description):
        # Create or update exception
        exc, created = ControlTowerException.objects.get_or_create(
            type=type,
            entity_type=entity_type,
            entity_id=entity_id,
            status='open',
            defaults={
                'severity': severity,
                'title': title,
                'description': description
            }
        )
        if not created:
            exc.severity = severity
            exc.title = title
            exc.description = description
            exc.save()

    @staticmethod
    def log_event(event_type, entity_type, entity_id, actor_id=None, metadata=None):
        OperationalEvent.objects.create(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            metadata=metadata or {}
        )
