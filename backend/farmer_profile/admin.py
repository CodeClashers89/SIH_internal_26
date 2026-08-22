from django.contrib import admin
from .models import FarmerProfile

@admin.register(FarmerProfile)
class FarmerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'trust_score', 'trust_tier', 'govt_id_verified')
    list_filter = ('soil_farming_type', 'govt_id_verified')
    search_fields = ('user__username', 'full_name', 'village')
    readonly_fields = ('created_at', 'updated_at', 'trust_tier', 'trust_color')
