from django.contrib import admin
from .models import LogisticsPartner, DeliveryShipment

class LogisticsPartnerAdmin(admin.ModelAdmin):
    list_display = ['name', 'pincode', 'district', 'phone', 'active']
    list_filter = ['active', 'district']

class DeliveryShipmentAdmin(admin.ModelAdmin):
    list_display = ['order', 'partner', 'distance_km', 'status', 'assigned_at']
    list_filter = ['status', 'assigned_at']
    search_fields = ['order__id', 'partner__name']

admin.site.register(LogisticsPartner, LogisticsPartnerAdmin)
admin.site.register(DeliveryShipment, DeliveryShipmentAdmin)
