from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('farmer', 'Farmer/FPO'),
        ('consumer', 'Consumer'),
        ('bulk_buyer', 'Bulk Buyer'),
        ('logistics_partner', 'Logistics Partner'),
        ('admin', 'Admin'),
    )
    
    KYC_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('not_required', 'Not Required'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='consumer')
    phone = models.CharField(max_length=15, blank=True, null=True, unique=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS_CHOICES, default='not_required')
    kyc_document = models.TextField(blank=True, null=True) # Base64 or URL description
    address = models.TextField(blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    district = models.CharField(max_length=50, blank=True, null=True)

    # Farmer specific fields
    farm_size = models.CharField(max_length=50, blank=True, null=True)
    crops_grown = models.TextField(blank=True, null=True)
    farm_coordinates = models.CharField(max_length=100, blank=True, null=True)

    # Bulk Buyer specific fields
    business_name = models.CharField(max_length=100, blank=True, null=True)
    business_type = models.CharField(max_length=100, blank=True, null=True)
    gst_number = models.CharField(max_length=50, blank=True, null=True)

    # Logistics Partner specific fields
    vehicle_number = models.CharField(max_length=50, blank=True, null=True)
    vehicle_type = models.CharField(max_length=50, blank=True, null=True)
    capacity = models.CharField(max_length=50, blank=True, null=True)
    service_area = models.CharField(max_length=100, blank=True, null=True)

    def save(self, *args, **kwargs):
        # Auto-set kyc status for farmers and logistics partners if not set
        if self.role in ['farmer', 'logistics_partner'] and self.kyc_status == 'not_required':
            self.kyc_status = 'pending'
        elif self.role not in ['farmer', 'logistics_partner']:
            self.kyc_status = 'not_required'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
