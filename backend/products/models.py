from django.db import models
from django.conf import settings
from datetime import date

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
        # Freshness is based on how close current date is to expiry compared to harvest date
        today = date.today()
        if today >= self.expiry_date:
            return 0
        if today <= self.harvest_date:
            return 100
        
        total_shelf_life = (self.expiry_date - self.harvest_date).days
        remaining_life = (self.expiry_date - today).days
        
        if total_shelf_life <= 0:
            return 0
        
        percentage = int((remaining_life / total_shelf_life) * 100)
        return max(0, min(100, percentage))

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
