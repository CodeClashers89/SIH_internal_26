from django.contrib import admin
from .models import Order, OrderItem, QuoteRequest

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'total_amount', 'status', 'payment_status', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['buyer__username', 'razorpay_order_id', 'payment_id']
    inlines = [OrderItemInline]

class QuoteRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'product', 'quantity', 'target_price', 'offered_price', 'status']
    list_filter = ['status', 'created_at']
    search_fields = ['buyer__username', 'product__name']

admin.site.register(Order, OrderAdmin)
admin.site.register(QuoteRequest, QuoteRequestAdmin)
