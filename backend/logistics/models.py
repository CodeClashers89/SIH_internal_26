from django.db import models
from django.conf import settings
from orders.models import Order
import random

class LogisticsPartner(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='logistics_profile'
    )
    name = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    district = models.CharField(max_length=50)
    phone = models.CharField(max_length=15)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.district})"

class DeliveryShipment(models.Model):
    STATUS_CHOICES = (
        ('assigned', 'Assigned'),
        ('picked_up', 'Picked Up'),
        ('delivered', 'Delivered'),
    )

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipment')
    partner = models.ForeignKey(LogisticsPartner, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    pickup_address = models.TextField()
    delivery_address = models.TextField()
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    delivery_otp = models.CharField(max_length=6, blank=True, null=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.delivery_otp:
            self.delivery_otp = str(random.randint(100000, 999999))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Shipment for Order #{self.order.id} - Partner: {self.partner.name if self.partner else 'None'} ({self.status})"
