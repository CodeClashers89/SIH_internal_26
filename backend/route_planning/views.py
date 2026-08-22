import logging
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction

from logistics.models import DeliveryShipment
from route_planning.models import RoutePlan, RouteAuditEvent
from route_planning.serializers import RoutePlanSerializer
from route_planning.services.route_planner import plan_shipment_route

logger = logging.getLogger(__name__)


def _can_user_access_shipment(user, shipment: DeliveryShipment) -> bool:
    """Verify if user has permission to view/manage this shipment's route."""
    if user.role == "admin":
        return True

    # Farmer who owns any product in the order
    if user.role == "farmer":
        order_items = shipment.order.items.all()
        return any(item.product and item.product.farmer_id == user.id for item in order_items)

    # Assigned logistics partner
    if user.role == "logistics_partner":
        partner = getattr(user, "logistics_profile", None)
        if partner and shipment.partner_id == partner.id:
            return True
        # If open job (partner is null), any active driver can inspect details
        if shipment.partner is None:
            return True
        return False

    # Consumer / Buyer
    if shipment.order.buyer_id == user.id:
        return True

    return False


class SharedShipmentRouteView(APIView):
    """
    GET /api/route-planning/shipments/{id}/route/

    The ONE authoritative route API consumed by both Driver and Farmer dashboards.
    Returns the active finalized RoutePlan for a shipment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, shipment_id):
        try:
            shipment = DeliveryShipment.objects.select_related("order", "partner").get(id=shipment_id)
        except DeliveryShipment.DoesNotExist:
            return Response({"error": "Shipment not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _can_user_access_shipment(request.user, shipment):
            return Response(
                {"error": "You are not authorized to view the route for this shipment."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get active route plan
        route_plan = RoutePlan.objects.filter(shipment=shipment, is_active=True).first()

        # If no active route plan exists, try getting the latest plan
        if not route_plan:
            route_plan = RoutePlan.objects.filter(shipment=shipment).order_by("-route_version").first()

        # If still no route plan exists, generate one automatically
        if not route_plan:
            try:
                route_plan = plan_shipment_route(
                    shipment_id=shipment.id,
                    user=request.user,
                    auto_confirm=True  # Auto-confirm initial route for seamless UX
                )
            except Exception as e:
                logger.error(f"[ROUTE_API] Auto-generation failed for shipment #{shipment_id}: {e}")
                return Response(
                    {"error": f"Failed to generate route plan: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        serializer = RoutePlanSerializer(route_plan)
        return Response({
            "shipment_id": shipment.id,
            "order_id": shipment.order_id,
            "shipment_status": shipment.status,
            "pickup_address": shipment.pickup_address,
            "delivery_address": shipment.delivery_address,
            "pickup_coordinates": [float(shipment.pickup_lat) if shipment.pickup_lat else None, float(shipment.pickup_lng) if shipment.pickup_lng else None],
            "destination_coordinates": [float(shipment.destination_lat) if shipment.destination_lat else None, float(shipment.destination_lng) if shipment.destination_lng else None],
            "route": serializer.data
        })


class GenerateShipmentRouteView(APIView):
    """
    POST /api/route-planning/shipments/{id}/generate-route/

    Triggers route planning pipeline. Generates candidate routes, analyzes weather risk,
    runs LLM comparison, and stores the recommended route plan.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, shipment_id):
        try:
            shipment = DeliveryShipment.objects.get(id=shipment_id)
        except DeliveryShipment.DoesNotExist:
            return Response({"error": "Shipment not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _can_user_access_shipment(request.user, shipment):
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        auto_confirm = request.data.get("auto_confirm", False)

        try:
            route_plan = plan_shipment_route(
                shipment_id=shipment.id,
                user=request.user,
                auto_confirm=auto_confirm
            )
            serializer = RoutePlanSerializer(route_plan)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"[GENERATE_ROUTE] Error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmShipmentRouteView(APIView):
    """
    POST /api/route-planning/shipments/{id}/confirm-route/

    Confirms a recommended route plan, making it the active operational route.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, shipment_id):
        try:
            shipment = DeliveryShipment.objects.get(id=shipment_id)
        except DeliveryShipment.DoesNotExist:
            return Response({"error": "Shipment not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _can_user_access_shipment(request.user, shipment):
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        route_plan_id = request.data.get("route_plan_id")
        if route_plan_id:
            route_plan = RoutePlan.objects.filter(id=route_plan_id, shipment=shipment).first()
        else:
            route_plan = RoutePlan.objects.filter(shipment=shipment).order_by("-route_version").first()

        if not route_plan:
            return Response({"error": "No route plan found to confirm."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Deactivate any previously active routes for this shipment
            RoutePlan.objects.filter(shipment=shipment, is_active=True).update(is_active=False, status="SUPERSEDED")

            route_plan.status = "CONFIRMED"
            route_plan.is_active = True
            route_plan.confirmed_at = timezone.now()
            route_plan.confirmed_by = request.user
            route_plan.save()

            RouteAuditEvent.objects.create(
                route_plan=route_plan,
                event_type="CONFIRMED",
                actor=request.user,
                route_version=route_plan.route_version,
                reason=request.data.get("reason", "Operator confirmed route selection.")
            )

        serializer = RoutePlanSerializer(route_plan)
        return Response({
            "message": f"RoutePlan v{route_plan.route_version} is now CONFIRMED and ACTIVE.",
            "route": serializer.data
        })


class DriverActiveDeliveryView(APIView):
    """
    GET /api/route-planning/driver/active-delivery/

    Returns the driver's current active delivery shipment and its finalized route.
    If no active delivery exists, returns { "active_delivery": null }.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != "logistics_partner":
            return Response({"error": "Access denied. Driver account required."}, status=status.HTTP_403_FORBIDDEN)

        partner = getattr(user, "logistics_profile", None)
        if not partner:
            return Response({"active_delivery": None, "message": "No active driver profile."})

        # Find active shipment assigned to this driver
        shipment = DeliveryShipment.objects.filter(
            partner=partner,
            status__in=["assigned", "picked_up", "handover_completed"]
        ).select_related("order", "order__buyer").first()

        if not shipment:
            return Response({"active_delivery": None, "message": "No active delivery assigned."})

        # Get or auto-generate active route plan
        route_plan = RoutePlan.objects.filter(shipment=shipment, is_active=True).first()
        if not route_plan:
            route_plan = RoutePlan.objects.filter(shipment=shipment).order_by("-route_version").first()

        if not route_plan:
            try:
                route_plan = plan_shipment_route(shipment_id=shipment.id, user=user, auto_confirm=True)
            except Exception as e:
                logger.error(f"[DRIVER_ACTIVE] Failed to auto-plan route for shipment #{shipment.id}: {e}")

        # Extract primary item for commodity info
        first_item = shipment.order.items.first()
        product = first_item.product if first_item else None

        route_data = RoutePlanSerializer(route_plan).data if route_plan else None

        return Response({
            "active_delivery": {
                "shipment_id": shipment.id,
                "order_id": shipment.order_id,
                "order_number": f"KB{10000 + shipment.order_id}",
                "commodity": product.name if product else "Produce",
                "quantity": f"{first_item.quantity} {product.unit}" if (first_item and product) else "Bulk",
                "pickup": shipment.pickup_address,
                "destination": shipment.delivery_address,
                "status": shipment.status,
                "pickup_coordinates": [float(shipment.pickup_lat) if shipment.pickup_lat else None, float(shipment.pickup_lng) if shipment.pickup_lng else None],
                "destination_coordinates": [float(shipment.destination_lat) if shipment.destination_lat else None, float(shipment.destination_lng) if shipment.destination_lng else None],
                "delivery_otp": shipment.delivery_otp,
                "route": route_data
            }
        })


class FarmerShipmentRouteView(APIView):
    """
    GET /api/route-planning/farmer/shipments/{shipment_id}/route/

    Farmer-specific route view. Ensures farmer owns the product in the shipment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, shipment_id):
        try:
            shipment = DeliveryShipment.objects.select_related("order", "partner").get(id=shipment_id)
        except DeliveryShipment.DoesNotExist:
            return Response({"error": "Shipment not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _can_user_access_shipment(request.user, shipment):
            return Response({"error": "You are not authorized to view this shipment."}, status=status.HTTP_403_FORBIDDEN)

        route_plan = RoutePlan.objects.filter(shipment=shipment, is_active=True).first()
        if not route_plan:
            route_plan = RoutePlan.objects.filter(shipment=shipment).order_by("-route_version").first()

        if not route_plan:
            try:
                route_plan = plan_shipment_route(shipment_id=shipment.id, user=request.user, auto_confirm=True)
            except Exception as e:
                logger.error(f"[FARMER_ROUTE] Auto-plan failed: {e}")

        serializer = RoutePlanSerializer(route_plan) if route_plan else None

        return Response({
            "shipment_id": shipment.id,
            "order_id": shipment.order_id,
            "status": shipment.status,
            "pickup_address": shipment.pickup_address,
            "delivery_address": shipment.delivery_address,
            "partner_name": shipment.partner.name if shipment.partner else "Unassigned",
            "vehicle_number": shipment.partner.user.vehicle_number if (shipment.partner and shipment.partner.user) else "N/A",
            "route": serializer.data if serializer else None
        })


class RouteHistoryView(APIView):
    """
    GET /api/route-planning/shipments/{id}/route-history/

    Returns all route plan versions for audit and tracking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, shipment_id):
        try:
            shipment = DeliveryShipment.objects.get(id=shipment_id)
        except DeliveryShipment.DoesNotExist:
            return Response({"error": "Shipment not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _can_user_access_shipment(request.user, shipment):
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        routes = RoutePlan.objects.filter(shipment=shipment).order_by("-route_version")
        serializer = RoutePlanSerializer(routes, many=True)
        return Response({
            "shipment_id": shipment.id,
            "total_versions": routes.count(),
            "routes": serializer.data
        })
