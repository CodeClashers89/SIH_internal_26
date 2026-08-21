from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, AuctionViewSet, GroupOrderViewSet, FlashSaleViewSet, TraceabilityLotViewSet

router = DefaultRouter()
router.register(r'auctions', AuctionViewSet, basename='auction')
router.register(r'group-orders', GroupOrderViewSet, basename='group-order')
router.register(r'flash-sales', FlashSaleViewSet, basename='flash-sale')
router.register(r'traceability', TraceabilityLotViewSet, basename='traceability')
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
]
