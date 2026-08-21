from django.contrib import admin
from .models import MandiPrice

class MandiPriceAdmin(admin.ModelAdmin):
    list_display = ['commodity', 'variety', 'market', 'state', 'modal_price', 'date']
    list_filter = ['state', 'commodity', 'date']
    search_fields = ['commodity', 'market', 'district']

admin.site.register(MandiPrice, MandiPriceAdmin)
