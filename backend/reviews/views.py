from rest_framework import viewsets, permissions
from .models import Review
from .serializers import ReviewSerializer

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        farmer_id = self.request.query_params.get('farmer')
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)
