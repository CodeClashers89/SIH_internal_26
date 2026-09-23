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

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': 'Profile details updated successfully.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        phone = request.data.get('phone')
        otp = str(request.data.get('otp', '')).strip()
        msg91_token = request.data.get('msg91_token') or request.data.get('access_token')
        req_id = request.data.get('req_id') or request.data.get('reqId')
        msg91_verified = request.data.get('msg91_verified')

        if not phone and not msg91_token:
            return Response({'error': 'Please provide phone and OTP or MSG91 verification token.'}, status=status.HTTP_400_BAD_REQUEST)

        # Flexible phone matching (supports +91, 91, or raw 10 digits)
        clean_phone = ''.join(c for c in str(phone) if c.isdigit())
        last_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
        
        user = None
        if last_10:
            user = User.objects.filter(phone__icontains=last_10).first()
        
        if not user and phone:
            user = User.objects.filter(phone=phone).first()

        if not user:
            return Response({'error': 'User with this phone number does not exist'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Verify via MSG91 server-side access token
        if msg91_token and msg91_token != 'verified':
            try:
                import requests, os
                authkey = os.environ.get('MSG91_AUTH_KEY', '564962TA0jersOB6a90124eP1')
                headers = {'authkey': authkey, 'Content-Type': 'application/json'}
                resp = requests.post(
                    'https://api.msg91.com/api/v5/widget/verifyAccessToken',
                    json={'access-token': msg91_token},
                    headers=headers,
                    timeout=8
                )
                if resp.status_code == 200 and resp.json().get('type') == 'success':
                    user.is_verified = True
                    user.save()
                    return Response({
                        'message': 'MSG91 OTP verification successful. Account verified.',
                        'user': UserSerializer(user).data
                    }, status=status.HTTP_200_OK)
            except Exception as e:
                print(f"[MSG91 API WARNING] Failed to verify token with MSG91: {e}")

        # 2. Direct verify with MSG91 widget/verifyOtp API if req_id and otp provided
        if req_id and otp:
            try:
                import requests, os
                widget_id = os.environ.get('MSG91_WIDGET_ID', '3668416a466e363834343939')
                token_auth = os.environ.get('SMS_GATEWAY_KEY', '564962TA0jersOB6a90124eP1')
                resp = requests.post(
                    'https://control.msg91.com/api/v5/widget/verifyOtp',
                    json={
                        'widgetId': widget_id,
                        'tokenAuth': token_auth,
                        'otp': otp,
                        'reqId': str(req_id).strip()
                    },
                    headers={'tokenAuth': token_auth, 'Content-Type': 'application/json'},
                    timeout=8
                )
                if resp.status_code == 200 and resp.json().get('type') == 'success':
                    user.is_verified = True
                    user.save()
                    return Response({
                        'message': 'MSG91 OTP verified successfully. Account activated.',
                        'user': UserSerializer(user).data
                    }, status=status.HTTP_200_OK)
            except Exception as e:
                print(f"[MSG91 DIRECT VERIFY WARNING] {e}")

        # 3. If MSG91 widget verified on frontend and passed as verified flag
        if msg91_verified in [True, 'true', 'True', 1] or msg91_token == 'verified':
            user.is_verified = True
            user.save()
            return Response({
                'message': 'MSG91 OTP verified successfully. Account activated.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        # 4. Verify via OTP code (or universal demo bypass 123456)
        if otp and (user.otp == otp or otp == '123456'):
            user.is_verified = True
            user.save()
            return Response({
                'message': 'OTP verification successful. Account verified.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid OTP or expired verification token.'}, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        phone = request.data.get('phone')
        if not phone:
            return Response({'error': 'Please provide a registered mobile number.'}, status=status.HTTP_400_BAD_REQUEST)

        clean_phone = ''.join(c for c in str(phone) if c.isdigit())
        last_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
        
        user = User.objects.filter(phone__icontains=last_10).first() if last_10 else None
        if not user:
            return Response({'error': f'No account found registered with phone number: {phone}'}, status=status.HTTP_404_NOT_FOUND)

        import random
        otp = str(random.randint(100000, 999999))
        user.otp = otp
        user.save()
        print(f"\n[PASSWORD RESET OTP] Generated OTP {otp} for user {user.username} ({user.phone})\n")

        return Response({
            'message': f'Password reset OTP sent to {user.phone}.',
            'phone': user.phone,
            'username': user.username
        }, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        phone = request.data.get('phone')
        otp = str(request.data.get('otp', '')).strip()
        new_password = request.data.get('new_password')
        msg91_token = request.data.get('msg91_token') or request.data.get('access_token')
        req_id = request.data.get('req_id') or request.data.get('reqId')
        msg91_verified = request.data.get('msg91_verified')

        if not phone:
            return Response({'error': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password or len(new_password) < 6:
            return Response({'error': 'Password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        clean_phone = ''.join(c for c in str(phone) if c.isdigit())
        last_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
        user = User.objects.filter(phone__icontains=last_10).first() if last_10 else None
        
        if not user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        verified = False

        # 1. Validate MSG91 token if provided
        if msg91_token and msg91_token != 'verified':
            try:
                import requests, os
                authkey = os.environ.get('MSG91_AUTH_KEY', '564962TA0jersOB6a90124eP1')
                headers = {'authkey': authkey, 'Content-Type': 'application/json'}
                resp = requests.post(
                    'https://api.msg91.com/api/v5/widget/verifyAccessToken',
                    json={'access-token': msg91_token},
                    headers=headers,
                    timeout=8
                )
                if resp.status_code == 200 and resp.json().get('type') == 'success':
                    verified = True
            except Exception as e:
                print(f"[MSG91 RESET VERIFY WARNING] {e}")

        # 2. Direct verify with MSG91 widget/verifyOtp API if req_id and otp provided
        if not verified and req_id and otp:
            try:
                import requests, os
                widget_id = os.environ.get('MSG91_WIDGET_ID', '3668416a466e363834343939')
                token_auth = os.environ.get('SMS_GATEWAY_KEY', '564962TA0jersOB6a90124eP1')
                resp = requests.post(
                    'https://control.msg91.com/api/v5/widget/verifyOtp',
                    json={
                        'widgetId': widget_id,
                        'tokenAuth': token_auth,
                        'otp': otp,
                        'reqId': str(req_id).strip()
                    },
                    headers={'tokenAuth': token_auth, 'Content-Type': 'application/json'},
                    timeout=8
                )
                if resp.status_code == 200 and resp.json().get('type') == 'success':
                    verified = True
            except Exception as e:
                print(f"[MSG91 RESET DIRECT VERIFY WARNING] {e}")

        # 3. Check frontend verification flag, verified token/API, local OTP, or universal test code 123456
        if (
            verified
            or msg91_verified in [True, 'true', 'True', 1]
            or msg91_token == 'verified'
            or (otp and (user.otp == otp or otp == '123456'))
        ):
            user.set_password(new_password)
            user.otp = ''
            user.save()
            return Response({
                'message': 'Password reset successful! You can now log in with your new password.',
                'username': user.username
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid or expired OTP. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

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
