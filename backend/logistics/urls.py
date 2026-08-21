from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LogisticsPartnerViewSet,
    DeliveryShipmentViewSet,
    LogisticsStatsView,
    LogisticsVehicleUpdateView,
)

router = DefaultRouter()
router.register(r'partners', LogisticsPartnerViewSet, basename='logistics-partner')
router.register(r'shipments', DeliveryShipmentViewSet, basename='delivery-shipment')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', LogisticsStatsView.as_view(), name='logistics-stats'),
    path('vehicle/update/', LogisticsVehicleUpdateView.as_view(), name='logistics-vehicle-update'),
]
