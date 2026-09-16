from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
)

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy'})

def api_root(request):
    return JsonResponse({
        'service': 'KisanConnect API',
        'status': 'running',
        'frontend': 'http://localhost:5173/',
        'health': '/api/health/',
        'documentation': '/api/schema/swagger-ui/',
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', api_root, name='api_root'),
    
    # Health check endpoint
    path('api/health/', health_check, name='health_check'),
    
    # API endpoints
    path('api/', include('users.urls')),
    path('api/v1/', include('farmer_profile.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/logistics/', include('logistics.urls')),
    path('api/mandi-prices/', include('pricing.urls')),
    path('api/market-prices/', include('pricing.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/control-tower/', include('control_tower.urls')),
    path('api/route-planning/', include('route_planning.urls')),
    
    # Chatbot API (Farmer AI Assistant)
    path('api/chat/', include('chatbot.urls')),
    
    # API documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

