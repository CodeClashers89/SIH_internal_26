from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ControlTowerSummaryView, ControlTowerExceptionViewSet

router = DefaultRouter()
router.register(r'exceptions', ControlTowerExceptionViewSet, basename='exception')

urlpatterns = [
    path('summary/', ControlTowerSummaryView.as_view(), name='control-tower-summary'),
    path('', include(router.urls)),
]
