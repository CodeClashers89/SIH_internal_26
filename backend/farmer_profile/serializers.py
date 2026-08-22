from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import FarmerProfile

User = get_user_model()


class FarmerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for FarmerProfile with nested read-only user fields
    and masked bank account number on read.
    """

    # Read-only user fields surfaced at top level
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    kyc_status = serializers.CharField(source='user.kyc_status', read_only=True)
    district = serializers.CharField(source='user.district', read_only=True)
    pincode = serializers.CharField(source='user.pincode', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)

    # Computed fields
    trust_tier = serializers.CharField(read_only=True)
    trust_color = serializers.CharField(read_only=True)

    # Masked bank account for read operations
    masked_account_number = serializers.SerializerMethodField()

    class Meta:
        model = FarmerProfile
        fields = (
            # User fields (read-only)
            'username', 'email', 'phone', 'is_verified', 'kyc_status',
            'district', 'pincode', 'date_joined',
            # Profile identity
            'avatar_url', 'full_name', 'farm_name', 'alternate_whatsapp',
            'village', 'taluka', 'state',
            'farm_size_value', 'farm_size_unit', 'soil_farming_type',
            # Trust & performance
            'trust_score', 'trust_tier', 'trust_color',
            'total_trips', 'ontime_rate', 'avg_rating', 'rating_count',
            'dispute_free_rate', 'avg_freshness',
            # Certifications & Gallery
            'soil_health_verified', 'zero_chemicals', 'gallery_images',
            # Crops & production
            'primary_crops', 'production_seasons', 'irrigation_source',
            'regular_supplier_to', 'production_capacity',
            # Bank & payout
            'bank_account_name', 'bank_account_number', 'masked_account_number',
            'ifsc_code', 'upi_id',
            # KYC
            'govt_id_type', 'govt_id_number', 'govt_id_verified',
            # Timestamps
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'trust_score', 'trust_tier', 'trust_color',
            'total_trips', 'ontime_rate', 'avg_rating', 'rating_count',
            'dispute_free_rate', 'avg_freshness',
            'soil_health_verified', 'zero_chemicals',
            'govt_id_verified',
            'created_at', 'updated_at',
        )
        extra_kwargs = {
            # bank_account_number is write-only (masked version is read via masked_account_number)
            'bank_account_number': {'write_only': True, 'required': False},
        }

    def get_masked_account_number(self, obj):
        """Mask the bank account number for display, showing only last 4 digits."""
        acct = obj.bank_account_number
        if not acct or len(acct) < 4:
            return acct or ''
        return f"XXXX-XXXX-{acct[-4:]}"

    def validate_alternate_whatsapp(self, value):
        if value:
            cleaned = ''.join(c for c in value if c.isdigit() or c == '+')
            if len(cleaned) < 10:
                raise serializers.ValidationError("WhatsApp number must be at least 10 digits.")
            return cleaned
        return value

    def validate_ifsc_code(self, value):
        if value:
            import re
            if not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', value.upper()):
                raise serializers.ValidationError("Invalid IFSC code format. Expected: ABCD0XXXXXX")
            return value.upper()
        return value
