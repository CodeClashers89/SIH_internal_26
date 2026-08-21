from rest_framework import viewsets, permissions
from .models import MandiPrice
from .serializers import MandiPriceSerializer

class MandiPriceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MandiPrice.objects.all().order_by('-date')
    serializer_class = MandiPriceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        state = self.request.query_params.get('state')
        if state:
            queryset = queryset.filter(state__iexact=state)
            
        district = self.request.query_params.get('district')
        if district:
            queryset = queryset.filter(district__iexact=district)
            
        commodity = self.request.query_params.get('commodity')
        if commodity:
            queryset = queryset.filter(commodity__icontains=commodity)
            
        return queryset
