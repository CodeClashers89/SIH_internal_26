from django.contrib import admin
from .models import Product

class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'farmer', 'quantity', 'unit', 'price_per_unit', 'harvest_date', 'expiry_date']
    list_filter = ['category', 'harvest_date']
    search_fields = ['name', 'farmer__username', 'description']

admin.site.register(Product, ProductAdmin)
