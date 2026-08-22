from django.db import models

class Market(models.Model):
    name = models.CharField(max_length=200)
    normalized_name = models.CharField(max_length=200, db_index=True)
    district = models.CharField(max_length=100, db_index=True)
    state = models.CharField(max_length=100, db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    source = models.CharField(max_length=100, default="AGMARKNET")
    source_identifier = models.CharField(max_length=255, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    last_geocoded_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('normalized_name', 'district', 'state')

    def __str__(self):
        return f"{self.name}, {self.district}, {self.state}"


class MarketPrice(models.Model):
    market = models.ForeignKey(Market, on_delete=models.CASCADE, related_name='prices')
    
    commodity = models.CharField(max_length=100, db_index=True)
    variety = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    grade = models.CharField(max_length=100, blank=True, null=True)
    
    min_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    modal_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    unit = models.CharField(max_length=50, blank=True, null=True, default="Rs/Quintal")
    
    reported_date = models.DateField(db_index=True)
    fetched_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.commodity} at {self.market.name} on {self.reported_date} - Modal: {self.modal_price}"
