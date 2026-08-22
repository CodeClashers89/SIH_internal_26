from django.db import models
from django.conf import settings
from products.models import Product

class Order(models.Model):
    STATUS_CHOICES = (
        ('placed', 'Placed'),
        ('confirmed', 'Confirmed'),
        ('packed', 'Packed'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )
    
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    )

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    product_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)  # product_subtotal + shipping_charge
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='placed')
    shipping_address = models.TextField()
    shipping_pincode = models.CharField(max_length=10)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    subscription = models.ForeignKey(
        'Subscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    cancellation_locked = models.BooleanField(default=False)
    cancellation_locked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} by {self.buyer.username} - Status: {self.status}"


class Subscription(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )
    FREQUENCY_CHOICES = (
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-Weekly'),
        ('daily', 'Daily'),
    )
    TIME_SLOT_CHOICES = (
        ('morning', 'Morning (6:00 AM - 9:00 AM)'),
        ('afternoon', 'Afternoon (12:00 PM - 3:00 PM)'),
        ('evening', 'Evening (5:00 PM - 8:00 PM)'),
    )

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='weekly')
    delivery_day = models.CharField(max_length=20, default='Monday')
    delivery_time_slot = models.CharField(max_length=20, choices=TIME_SLOT_CHOICES, default='morning')
    duration_months = models.IntegerField(default=2)
    total_deliveries = models.IntegerField(default=8)
    completed_deliveries = models.IntegerField(default=0)
    start_date = models.DateField()
    next_delivery_date = models.DateField()
    
    shipping_address = models.TextField()
    shipping_pincode = models.CharField(max_length=10)
    
    per_delivery_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=5.0)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    per_delivery_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_plan_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    razorpay_subscription_id = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Subscription #{self.id} by {self.buyer.username} ({self.delivery_day} {self.delivery_time_slot})"


class SubscriptionItem(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name if self.product else 'Product'} in Sub #{self.subscription.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name if self.product else 'Deleted Product'} in Order #{self.order.id}"

class QuoteRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Farmer Offer'),
        ('offered', 'Price Offered'),
        ('accepted', 'Accepted & Ordered'),
        ('rejected', 'Rejected'),
    )

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quotes'
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='quotes')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    target_price = models.DecimalField(max_digits=10, decimal_places=2) # requested price per unit
    offered_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) # farmer counter-offer
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Quote #{self.id} by {self.buyer.username} for {self.product.name} (Qty: {self.quantity})"

class BulkRequirement(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('fulfilled', 'Fulfilled'),
        ('cancelled', 'Cancelled'),
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='requirements'
    )
    crop_name = models.CharField(max_length=100)
    variety = models.CharField(max_length=100, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='kg')
    grade = models.CharField(max_length=10, default='A')
    required_date = models.DateField()
    target_price_min = models.DecimalField(max_digits=10, decimal_places=2)
    target_price_max = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bulk Requirement for {self.crop_name} - Qty: {self.quantity} {self.unit} by {self.buyer.username}"

class FarmerOffer(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('countered', 'Countered'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    )
    requirement = models.ForeignKey(
        BulkRequirement,
        on_delete=models.CASCADE,
        related_name='offers'
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='offers'
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Farmer Offer by {self.farmer.username} - {self.quantity} kg @ Rs.{self.price_per_unit}/kg"

class PreHarvestContract(models.Model):
    STATUS_CHOICES = (
        ('proposed', 'Proposed'),
        ('accepted', 'Accepted'),
        ('harvest_pending', 'Harvest Pending'),
        ('ready', 'Ready'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contracts_as_farmer'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contracts_as_buyer',
        null=True,
        blank=True
    )
    crop_name = models.CharField(max_length=100)
    expected_harvest_date = models.DateField()
    expected_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='kg')
    contract_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='proposed')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Contract for {self.crop_name} (Farmer: {self.farmer.username}, Price: Rs.{self.contract_price}/kg)"
