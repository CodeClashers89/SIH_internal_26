from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MarketViewSet

router = DefaultRouter()
router.register(r'markets', MarketViewSet, basename='market')

urlpatterns = [
    path('', include(router.urls)),
]
