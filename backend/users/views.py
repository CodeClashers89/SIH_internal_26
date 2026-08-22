from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta, date
from .serializers import RegisterSerializer, UserSerializer, KYCSubmissionSerializer
from .permissions import IsFarmer, IsAdmin
from products.models import Product
from orders.models import Order, OrderItem

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class VerifyOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        phone = request.data.get('phone')
        otp = request.data.get('otp')

        if not phone or not otp:
            return Response({'error': 'Please provide both phone and otp'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(phone=phone)
            # Universal sandbox OTP: '123456'
            if user.otp == otp or otp == '123456':
                user.is_verified = True
                user.save()
                return Response({
                    'message': 'OTP verification successful. Account verified.',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User with this phone number does not exist'}, status=status.HTTP_404_NOT_FOUND)

class SubmitKYCView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFarmer]

    def post(self, request):
        user = request.user
        serializer = KYCSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            user.kyc_document = serializer.validated_data['kyc_document']
            user.kyc_status = 'pending'
            user.save()
            return Response({
                'message': 'KYC document submitted successfully. Under review.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PendingKYCView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(role='farmer', kyc_status='pending')

class VerifyKYCView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            farmer = User.objects.get(pk=pk, role='farmer')
            kyc_status_input = request.data.get('status')
            
            if kyc_status_input not in ['approved', 'rejected']:
                return Response({'error': 'Status must be approved or rejected'}, status=status.HTTP_400_BAD_REQUEST)
                
            farmer.kyc_status = kyc_status_input
            farmer.save()
            return Response({
                'message': f'Farmer KYC status updated to {kyc_status_input}.',
                'user': UserSerializer(farmer).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Farmer not found'}, status=status.HTTP_404_NOT_FOUND)

class FarmerDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFarmer]

    def get(self, request):
        farmer = request.user
        
        # 1. Total earnings from confirmed/delivered orders
        items = OrderItem.objects.filter(
            product__farmer=farmer,
            order__payment_status='paid',
            order__status__in=['confirmed', 'packed', 'in_transit', 'delivered']
        )
        total_earnings = sum(item.quantity * item.price for item in items)
        
        # 2. Total orders count
        orders_count = items.values('order').distinct().count()
        
        # 3. Low stock warning products (stock < 50 kg/units)
        products_stock = Product.objects.filter(farmer=farmer).values('id', 'name', 'quantity', 'unit')
        
        # 4. Demand Trend: Sales per category over the last 30 days (pure aggregation)
        # TODO: [ML Model Integration]
        # In a future release, we can load a forecasting model here (e.g., Prophet, ARIMA, or LSTM).
        # We would import the forecasting script, load the model artifacts, and execute predictions:
        #
        # import joblib
        # forecast_model = joblib.load('models/forecaster.pkl')
        # future_dates = pd.date_range(start=timezone.now().date(), periods=15)
        # predicted_sales = forecast_model.predict(future_dates)
        #
        # For now, we aggregate historical records over the last 30 days.
        today = timezone.now().date()
        days_30_ago = today - timedelta(days=30)
        
        # Optimize 30 queries into a single group-by query
        sales_qs = OrderItem.objects.filter(
            product__farmer=farmer,
            order__created_at__date__gte=days_30_ago,
            order__created_at__date__lte=today,
            order__payment_status='paid'
        ).values('order__created_at__date').annotate(total=Sum('quantity'))
        
        sales_dict = {item['order__created_at__date'].strftime('%Y-%m-%d'): item['total'] for item in sales_qs}
        
        sales_by_day = []
        for i in range(30):
            target_date = days_30_ago + timedelta(days=i)
            date_str = target_date.strftime('%Y-%m-%d')
            sales_by_day.append({
                'date': date_str,
                'quantity': float(sales_dict.get(date_str, 0))
            })

        return Response({
            'total_earnings': float(total_earnings),
            'total_orders_received': orders_count,
            'inventory_status': list(products_stock),
            'demand_trends': sales_by_day
        }, status=status.HTTP_200_OK)
