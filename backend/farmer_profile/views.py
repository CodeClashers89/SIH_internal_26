from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import FarmerProfile
from .serializers import FarmerProfileSerializer
from users.permissions import IsFarmer


class FarmerProfileView(APIView):
    """
    GET /api/v1/farmer/profile/ - Retrieve the authenticated farmer's profile. Auto-creates with mock data if not exists.
    PUT /api/v1/farmer/profile/ - Update the farmer's profile.
    """
    permission_classes = [permissions.IsAuthenticated, IsFarmer]

    def get(self, request):
        user = request.user
        
        # Get or create profile with some sensible default mock data for demo purposes
        profile, created = FarmerProfile.objects.get_or_create(
            user=user,
            defaults={
                'trust_score': 94,
                'total_trips': 47,
                'ontime_rate': 96.5,
                'avg_rating': 4.8,
                'rating_count': 32,
                'dispute_free_rate': 99.1,
                'avg_freshness': 91.0,
                'full_name': f"{user.username.capitalize()}",
                'farm_name': f"{user.username.capitalize()} Organic Farms",
                'village': 'Navi Peth',
                'taluka': 'Haveli',
                'state': 'Maharashtra',
                'soil_health_verified': True,
                'zero_chemicals': True,
                'gallery_images': [
                    'https://images.unsplash.com/photo-1592982537447-6f296317bc37?auto=format&fit=crop&q=80&w=400',
                    'https://images.unsplash.com/photo-1628102491629-778571d893a3?auto=format&fit=crop&q=80&w=400',
                    'https://images.unsplash.com/photo-1595856728574-0f2b3e8e16be?auto=format&fit=crop&q=80&w=400'
                ],
                'primary_crops': ['Tomato', 'Onion', 'Cotton'],
                'production_seasons': ['Rabi', 'Kharif'],
                'regular_supplier_to': 3,
                'production_capacity': '500kg / week',
                'bank_account_name': f"{user.username.capitalize()} Agri Enterprise",
                'govt_id_verified': True if user.kyc_status == 'approved' else False
            }
        )
        
        # If the user's KYC status changed to approved, make sure the profile reflects it
        if user.kyc_status == 'approved' and not profile.govt_id_verified:
            profile.govt_id_verified = True
            profile.save(update_fields=['govt_id_verified'])

        serializer = FarmerProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        
        try:
            profile = FarmerProfile.objects.get(user=user)
        except FarmerProfile.DoesNotExist:
            return Response(
                {"error": "Profile not found. Please GET the profile first to initialize it."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FarmerProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Re-fetch to return the masked account number properly computed
            profile.refresh_from_db()
            return Response(FarmerProfileSerializer(profile).data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
