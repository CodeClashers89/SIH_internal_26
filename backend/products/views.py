from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from decimal import Decimal
from .models import Product, Auction, Bid, GroupOrder, GroupOrderParticipant, FlashSale, TraceabilityLot
from .serializers import (
    ProductSerializer, AuctionSerializer, BidSerializer, 
    GroupOrderSerializer, GroupOrderParticipantSerializer, 
    FlashSaleSerializer, TraceabilityLotSerializer
)
from users.permissions import IsFarmer

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.farmer == request.user

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsFarmer]
        else:
            permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtering by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        # Filtering by farmer
        farmer_id = self.request.query_params.get('farmer')
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)
            
        # Filtering by district (from farmer's profile)
        district = self.request.query_params.get('district')
        if district:
            queryset = queryset.filter(farmer__district__icontains=district)

        # Filtering by pincode (from farmer's profile)
        pincode = self.request.query_params.get('pincode')
        if pincode:
            queryset = queryset.filter(farmer__pincode=pincode)
            
        # Search query (by product name or description)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(description__icontains=search)
            
        return queryset

    def perform_create(self, serializer):
        # Auto-set the farmer to the current authenticated farmer
        serializer.save(farmer=self.request.user)

class AuctionViewSet(viewsets.ModelViewSet):
    queryset = Auction.objects.all().order_by('-created_at')
    serializer_class = AuctionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    @action(detail=True, methods=['post'])
    def bid(self, request, pk=None):
        auction = self.get_object()
        bid_amount = request.data.get('bid_amount')
        if not bid_amount:
            return Response({'error': 'Bid amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        bid_amount = Decimal(str(bid_amount))
        if bid_amount <= auction.highest_bid or bid_amount < auction.starting_price:
            return Response({'error': 'Bid must be higher than current highest bid and starting price.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Save bid
        bid = Bid.objects.create(
            auction=auction,
            buyer=request.user,
            bid_amount=bid_amount
        )
        auction.highest_bid = bid_amount
        auction.save()

        return Response(AuctionSerializer(auction).data)

class GroupOrderViewSet(viewsets.ModelViewSet):
    queryset = GroupOrder.objects.all().order_by('-created_at')
    serializer_class = GroupOrderSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        group_order = self.get_object()
        quantity = request.data.get('quantity')
        if not quantity:
            return Response({'error': 'Quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        quantity = Decimal(str(quantity))
        participant, created = GroupOrderParticipant.objects.get_or_create(
            group_order=group_order,
            user=request.user,
            defaults={'quantity': quantity, 'paid': True}
        )
        if not created:
            participant.quantity += quantity
            participant.save()

        group_order.current_quantity += quantity
        if group_order.current_quantity >= group_order.target_quantity:
            group_order.status = 'succeeded'
        group_order.save()

        return Response(GroupOrderSerializer(group_order).data)

class FlashSaleViewSet(viewsets.ModelViewSet):
    queryset = FlashSale.objects.all().order_by('-created_at')
    serializer_class = FlashSaleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class TraceabilityLotViewSet(viewsets.ModelViewSet):
    queryset = TraceabilityLot.objects.all().order_by('-created_at')
    serializer_class = TraceabilityLotSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'lot_id'
