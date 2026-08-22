from django.db import models
from django.conf import settings


class FarmerProfile(models.Model):
    """
    Extended profile for farmers. OneToOne with the User model.
    Stores identity, trust metrics, crop preferences, bank details, and KYC info
    that are NOT part of the core User model.
    """

    SOIL_TYPE_CHOICES = (
        ('organic', 'Organic'),
        ('natural', 'Natural'),
        ('conventional', 'Conventional'),
        ('mixed', 'Mixed'),
    )

    FARM_UNIT_CHOICES = (
        ('acres', 'Acres'),
        ('bigha', 'Bigha'),
        ('hectares', 'Hectares'),
    )

    IRRIGATION_CHOICES = (
        ('drip', 'Drip Irrigation'),
        ('canal', 'Canal'),
        ('well', 'Well / Borewell'),
        ('rainfed', 'Rainfed'),
        ('sprinkler', 'Sprinkler'),
    )

    GOVT_ID_CHOICES = (
        ('aadhaar', 'Aadhaar Card'),
        ('kcc', 'Kisan Credit Card'),
        ('pmkisan', 'PM-Kisan ID'),
        ('voter', 'Voter ID'),
    )

    # --- Link to User ---
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='farmer_profile'
    )

    # --- Personal & Farm Identity ---
    avatar_url = models.URLField(max_length=500, blank=True, default='')
    full_name = models.CharField(max_length=200, blank=True, default='')
    farm_name = models.CharField(max_length=200, blank=True, default='')
    alternate_whatsapp = models.CharField(max_length=15, blank=True, default='')
    village = models.CharField(max_length=100, blank=True, default='')
    taluka = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    farm_size_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    farm_size_unit = models.CharField(max_length=20, choices=FARM_UNIT_CHOICES, default='acres')
    soil_farming_type = models.CharField(max_length=20, choices=SOIL_TYPE_CHOICES, default='conventional')

    # --- Trust & Performance (auto-calculated / admin-set) ---
    trust_score = models.IntegerField(default=0)
    total_trips = models.IntegerField(default=0)
    ontime_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    rating_count = models.IntegerField(default=0)
    dispute_free_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    avg_freshness = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # --- Quality & Farming Practices Verification ---
    soil_health_verified = models.BooleanField(default=False)
    zero_chemicals = models.BooleanField(default=False)
    
    # --- Farm Gallery ---
    gallery_images = models.JSONField(default=list, blank=True)

    # --- Crops, Production & Commercial ---
    primary_crops = models.JSONField(default=list, blank=True)
    production_seasons = models.JSONField(default=list, blank=True)
    irrigation_source = models.CharField(max_length=20, choices=IRRIGATION_CHOICES, default='well')
    regular_supplier_to = models.IntegerField(default=0)
    production_capacity = models.CharField(max_length=100, blank=True, default='')

    # --- Bank & Payout ---
    bank_account_name = models.CharField(max_length=200, blank=True, default='')
    bank_account_number = models.CharField(max_length=30, blank=True, default='')
    ifsc_code = models.CharField(max_length=20, blank=True, default='')
    upi_id = models.CharField(max_length=100, blank=True, default='')

    # --- KYC / Government ID ---
    govt_id_type = models.CharField(max_length=20, choices=GOVT_ID_CHOICES, default='aadhaar')
    govt_id_number = models.CharField(max_length=30, blank=True, default='')
    govt_id_verified = models.BooleanField(default=False)

    # --- Timestamps ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Farmer Profile'
        verbose_name_plural = 'Farmer Profiles'

    def __str__(self):
        return f"Profile: {self.user.username} ({self.full_name or 'No name'})"

    @property
    def trust_tier(self):
        """Returns the trust tier label based on trust_score."""
        if self.trust_score >= 90:
            return 'Platinum Partner'
        elif self.trust_score >= 75:
            return 'Gold Partner'
        elif self.trust_score >= 50:
            return 'Silver Partner'
        else:
            return 'New Farmer'

    @property
    def trust_color(self):
        """Returns a color indicator for the trust tier."""
        if self.trust_score >= 90:
            return 'green'
        elif self.trust_score >= 75:
            return 'gold'
        elif self.trust_score >= 50:
            return 'blue'
        else:
            return 'gray'
