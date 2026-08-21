from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'phone', 'is_verified', 'kyc_status', 'district', 'pincode']
    list_filter = ['role', 'kyc_status', 'is_verified']
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role', 'phone', 'otp', 'is_verified', 'kyc_status', 'kyc_document', 'address', 'pincode', 'district')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role', 'phone', 'is_verified', 'kyc_status', 'address', 'pincode', 'district')}),
    )

admin.site.register(User, CustomUserAdmin)
