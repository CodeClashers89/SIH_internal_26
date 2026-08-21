from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, OrderCreateView, PaymentCallbackView, QuoteRequestViewSet,
    BulkRequirementViewSet, FarmerOfferViewSet, PreHarvestContractViewSet
)

router = DefaultRouter()
router.register(r'quotes', QuoteRequestViewSet, basename='quoterequest')
router.register(r'bulk-requirements', BulkRequirementViewSet, basename='bulk-requirement')
router.register(r'farmer-offers', FarmerOfferViewSet, basename='farmer-offer')
router.register(r'pre-harvest-contracts', PreHarvestContractViewSet, basename='pre-harvest-contract')
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('create/', OrderCreateView.as_view(), name='order-create'),
    path('payment-callback/', PaymentCallbackView.as_view(), name='payment-callback'),
    path('', include(router.urls)),
]
