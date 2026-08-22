from django.urls import path
from .views import FarmerProfileView

urlpatterns = [
    path('farmer/profile/', FarmerProfileView.as_view(), name='farmer-profile'),
]
