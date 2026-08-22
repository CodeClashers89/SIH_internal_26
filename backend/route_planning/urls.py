from django.urls import path
from route_planning.views import (
    SharedShipmentRouteView,
    GenerateShipmentRouteView,
    ConfirmShipmentRouteView,
    DriverActiveDeliveryView,
    FarmerShipmentRouteView,
    RouteHistoryView,
)

urlpatterns = [
    # Authoritative Shared Route API (consumed by Driver & Farmer)
    path("shipments/<int:shipment_id>/route/", SharedShipmentRouteView.as_view(), name="shipment-route"),

    # Pipeline Trigger & Management
    path("shipments/<int:shipment_id>/generate-route/", GenerateShipmentRouteView.as_view(), name="generate-route"),
    path("shipments/<int:shipment_id>/confirm-route/", ConfirmShipmentRouteView.as_view(), name="confirm-route"),
    path("shipments/<int:shipment_id>/recalculate-route/", GenerateShipmentRouteView.as_view(), name="recalculate-route"),
    path("shipments/<int:shipment_id>/route-history/", RouteHistoryView.as_view(), name="route-history"),

    # Role-specific shortcuts
    path("driver/active-delivery/", DriverActiveDeliveryView.as_view(), name="driver-active-delivery"),
    path("farmer/shipments/<int:shipment_id>/route/", FarmerShipmentRouteView.as_view(), name="farmer-shipment-route"),
]
