from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogisticsPartnerViewSet, DeliveryShipmentViewSet

router = DefaultRouter()
router.register(r'partners', LogisticsPartnerViewSet, basename='logistics-partner')
router.register(r'shipments', DeliveryShipmentViewSet, basename='delivery-shipment')

urlpatterns = [
    path('', include(router.urls)),
]
