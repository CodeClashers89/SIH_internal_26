from rest_framework import serializers
from django.contrib.auth import get_user_model
import random

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'role', 'phone', 
            'is_verified', 'kyc_status', 'kyc_document', 
            'address', 'pincode', 'district', 'date_joined',
            'farm_size', 'crops_grown', 'farm_coordinates',
            'business_name', 'business_type', 'gst_number',
            'vehicle_number', 'vehicle_type', 'capacity', 'service_area'
        )
        read_only_fields = ('id', 'is_verified', 'kyc_status', 'date_joined')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            'username', 'password', 'email', 'role', 
            'phone', 'address', 'pincode', 'district',
            'farm_size', 'crops_grown', 'farm_coordinates',
            'business_name', 'business_type', 'gst_number',
            'vehicle_number', 'vehicle_type', 'capacity', 'service_area'
        )

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', 'consumer')
        
        # If user is admin, set is_staff=True so they can log into django admin panel
        is_staff = True if role == 'admin' else False
        is_superuser = True if role == 'admin' else False
        
        # Generate mock OTP
        otp = str(random.randint(100000, 999999))
        print(f"\n[STUB OTP SERVICE] Created User: {validated_data.get('username')}. Send OTP: {otp} to {validated_data.get('phone')}\n")

        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            role=role,
            phone=validated_data.get('phone'),
            address=validated_data.get('address', ''),
            pincode=validated_data.get('pincode', ''),
            district=validated_data.get('district', ''),
            farm_size=validated_data.get('farm_size', ''),
            crops_grown=validated_data.get('crops_grown', ''),
            farm_coordinates=validated_data.get('farm_coordinates', ''),
            business_name=validated_data.get('business_name', ''),
            business_type=validated_data.get('business_type', ''),
            gst_number=validated_data.get('gst_number', ''),
            vehicle_number=validated_data.get('vehicle_number', ''),
            vehicle_type=validated_data.get('vehicle_type', ''),
            capacity=validated_data.get('capacity', ''),
            service_area=validated_data.get('service_area', ''),
            otp=otp,
            is_staff=is_staff,
            is_superuser=is_superuser,
            is_verified=False
        )
        user.set_password(password)
        user.save()
        return user

class KYCSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('kyc_document',)
        extra_kwargs = {
            'kyc_document': {'required': True}
        }
