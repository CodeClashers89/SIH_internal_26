from django.db import models
from django.conf import settings
from datetime import date, datetime
from django.utils import timezone

class Product(models.Model):
    CATEGORY_CHOICES = (
        ('fruits', 'Fruits'),
        ('vegetables', 'Vegetables'),
        ('grains', 'Grains'),
        ('pulses', 'Pulses'),
        ('spices', 'Spices'),
        ('others', 'Others'),
    )

    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products'
    )
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='kg') # e.g. kg, quintal, ton, piece
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    harvest_date = models.DateField()
    expiry_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def freshness_percentage(self):
        current_time = timezone.now()
        
        # Convert harvest_date to timezone-aware datetime at midnight
        harvest_dt = datetime.combine(self.harvest_date, datetime.min.time())
        harvest_dt = timezone.make_aware(harvest_dt, timezone.get_current_timezone())
        
        elapsed_hours = (current_time - harvest_dt).total_seconds() / 3600.0
        
        # Shelf life lookup based on category and name
        category_lower = self.category.lower() if self.category else ''
        name_lower = self.name.lower() if self.name else ''
        
        shelf_life_hours = 120 # Default fallback (Standard Vegetables)
        
        if category_lower == 'fruits':
            shelf_life_hours = 168
        elif category_lower in ['grains', 'pulses', 'spices']:
            shelf_life_hours = 720
        elif category_lower == 'vegetables':
            if any(word in name_lower for word in ['leafy', 'spinach', 'cabbage', 'lettuce', 'kale']):
                shelf_life_hours = 36
            else:
                shelf_life_hours = 120
                
        # Calculate dynamic freshness score
        # Freshness_Score = MAX(0, MIN(100, ROUND(100 - ((Elapsed_Hours / Shelf_Life_Hours) * 100), 2)))
        raw_score = 100 - ((elapsed_hours / shelf_life_hours) * 100)
        score = max(0, min(100, round(raw_score, 2)))
        
        # We can return it as an int for backward compatibility with frontend, but round to float works too
        # Since frontend expects a number that can be compared, rounding to 2 decimals is fine, or converting to int.
        # Original was int, let's keep it as int/float.
        return max(0, min(100, int(score)))

    def __str__(self):
        return f"{self.name} - {self.quantity} {self.unit} @ Rs.{self.price_per_unit}/{self.unit}"

class Auction(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='auctions')
    product_name = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='kg')
    starting_price = models.DecimalField(max_digits=10, decimal_places=2)
    highest_bid = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Auction for {self.product_name} - Highest Bid: Rs.{self.highest_bid}"

class Bid(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='bids')
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bids')
    bid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bid of Rs.{self.bid_amount} on {self.auction.product_name} by {self.buyer.username}"

class GroupOrder(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    )
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_groups')
    product_name = models.CharField(max_length=100)
    target_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    current_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    unit = models.CharField(max_length=20, default='kg')
    group_price = models.DecimalField(max_digits=10, decimal_places=2)
    deadline = models.DateTimeField()
    location = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Group Buy for {self.product_name} - Committed: {self.current_quantity}/{self.target_quantity}"

class GroupOrderParticipant(models.Model):
    group_order = models.ForeignKey(GroupOrder, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_participations')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quantity} units in Group Order #{self.group_order.id}"

class FlashSale(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='flash_sale')
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2)
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Flash Sale for {self.product.name} - Disc. Price: Rs.{self.discount_price}"

class TraceabilityLot(models.Model):
    lot_id = models.CharField(max_length=50, unique=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    farmer_name = models.CharField(max_length=100)
    farm_location = models.CharField(max_length=100)
    harvest_date = models.DateField()
    package_date = models.DateField()
    grade = models.CharField(max_length=10)
    logistics_partner = models.CharField(max_length=100, blank=True, null=True)
    buyer_name = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Lot {self.lot_id} - {self.farmer_name}"
