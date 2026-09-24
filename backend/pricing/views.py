from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Market, MarketPrice
from .serializers import MarketSerializer, MarketListSerializer, MarketPriceSerializer
from django.db.models import Prefetch

class MarketViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        # Trigger automatic sync if the DB is completely empty
        if Market.objects.filter(is_active=True).count() == 0:
            from .services import sync_agmarknet_data
            sync_agmarknet_data()

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
            # We can still filter DB if we have cached relation, or return all
            queryset = queryset.filter(prices__commodity__icontains=commodity).distinct()
            
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return MarketListSerializer
        return MarketSerializer

    def retrieve(self, request, *args, **kwargs):
        market = self.get_object()
        from .services import fetch_live_market_prices
        live_prices = fetch_live_market_prices(market.name, market.district, market.state)
        
        commodity = request.query_params.get('commodity')
        if commodity:
            live_prices = [p for p in live_prices if commodity.lower() in p['commodity'].lower()]
            
        serializer = self.get_serializer(market)
        data = serializer.data
        data['prices'] = live_prices
        return Response(data)

    @action(detail=True, methods=['get'])
    def prices(self, request, pk=None):
        market = self.get_object()
        from .services import fetch_live_market_prices
        live_prices = fetch_live_market_prices(market.name, market.district, market.state)
        
        commodity = request.query_params.get('commodity')
        if commodity:
            live_prices = [p for p in live_prices if commodity.lower() in p['commodity'].lower()]
            
        return Response(live_prices)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def status(self, request):
        """Returns live AGMARKNET (data.gov.in) API health and connectivity status."""
        from .services import check_agmarknet_api_health
        health = check_agmarknet_api_health()
        return Response(health)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def update_api_key(self, request):
        """Allows updating the DATA_GOV_API_KEY when expired or requested."""
        new_key = request.data.get('api_key', '').strip()
        if not new_key:
            return Response({'error': 'Please provide a non-empty API key.'}, status=400)
        
        from .services import update_data_gov_api_key, check_agmarknet_api_health
        success, msg = update_data_gov_api_key(new_key)
        if not success:
            return Response({'error': msg}, status=400)
        
        # Verify immediately
        health = check_agmarknet_api_health()
        return Response({
            'success': True,
            'message': msg,
            'health': health
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def sync(self, request):
        from .services import sync_agmarknet_data
        result = sync_agmarknet_data()
        if "error" in result:
            return Response(result, status=400)
        return Response(result)
