from django.urls import path
from .views import (
    RegisterView, CustomTokenObtainPairView, VerifyOTPView,
    SubmitKYCView, PendingKYCView, VerifyKYCView, FarmerDashboardStatsView,
    UserProfileView, PasswordResetRequestOTPView, PasswordResetConfirmView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/password-reset/request-otp/', PasswordResetRequestOTPView.as_view(), name='password-reset-request-otp'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('users/profile/', UserProfileView.as_view(), name='user-profile'),
    path('farmer/kyc/', SubmitKYCView.as_view(), name='submit-kyc'),
    path('farmer/stats/', FarmerDashboardStatsView.as_view(), name='farmer-stats'),
    path('admin/kyc-pending/', PendingKYCView.as_view(), name='kyc-pending'),
    path('admin/kyc-verify/<int:pk>/', VerifyKYCView.as_view(), name='kyc-verify'),
]
