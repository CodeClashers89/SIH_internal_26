from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MandiPriceViewSet

router = DefaultRouter()
router.register(r'', MandiPriceViewSet, basename='mandiprice')

urlpatterns = [
    path('', include(router.urls)),
]
