from django.db import models
from orders.models import Order

class PaymentRecord(models.Model):
    STATUS_CHOICES = (
        ('created', 'Created'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    razorpay_order_id = models.CharField(max_length=150, unique=True)
    razorpay_payment_id = models.CharField(max_length=150, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=256, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment for Order #{self.order.id} - Status: {self.status}"
