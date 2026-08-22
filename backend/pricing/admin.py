from django.contrib import admin
from .models import Market, MarketPrice

@admin.register(Market)
class MarketAdmin(admin.ModelAdmin):
    list_display = ('name', 'district', 'state', 'is_active', 'last_geocoded_at')
    list_filter = ('state', 'is_active')
    search_fields = ('name', 'district', 'state')

@admin.register(MarketPrice)
class MarketPriceAdmin(admin.ModelAdmin):
    list_display = ('commodity', 'variety', 'market', 'modal_price', 'reported_date')
    list_filter = ('commodity', 'reported_date', 'market__state')
    search_fields = ('commodity', 'market__name')
