from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Market, MarketPrice
from .serializers import MarketSerializer, MarketListSerializer, MarketPriceSerializer
from django.db.models import Prefetch

class MarketViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Market.objects.filter(is_active=True)
        
        state = self.request.query_params.get('state')
        if state:
            queryset = queryset.filter(state__iexact=state)
            
        district = self.request.query_params.get('district')
        if district:
            queryset = queryset.filter(district__iexact=district)
            
        # Optional: Filter by commodity by checking if market has related prices
        commodity = self.request.query_params.get('commodity')
        if commodity:
            queryset = queryset.filter(prices__commodity__icontains=commodity).distinct()
            
        # If detail view, prefetch prices so they load efficiently
        if self.action == 'retrieve':
            # Pre-filter prefetch if commodity param is passed to detail view
            if commodity:
                prefetch = Prefetch('prices', queryset=MarketPrice.objects.filter(commodity__icontains=commodity).order_by('-reported_date'))
            else:
                prefetch = Prefetch('prices', queryset=MarketPrice.objects.order_by('-reported_date'))
            queryset = queryset.prefetch_related(prefetch)
            
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return MarketListSerializer
        return MarketSerializer

    @action(detail=True, methods=['get'])
    def prices(self, request, pk=None):
        market = self.get_object()
        prices = market.prices.all().order_by('-reported_date')
        
        commodity = request.query_params.get('commodity')
        if commodity:
            prices = prices.filter(commodity__icontains=commodity)
            
        serializer = MarketPriceSerializer(prices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def sync(self, request):
        from .services import sync_agmarknet_data
        result = sync_agmarknet_data()
        if "error" in result:
            return Response(result, status=400)
        return Response(result)
