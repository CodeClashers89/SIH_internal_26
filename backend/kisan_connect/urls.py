from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include('users.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/logistics/', include('logistics.urls')),
    path('api/mandi-prices/', include('pricing.urls')),
    path('api/market-prices/', include('pricing.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/control-tower/', include('control_tower.urls')),
    
    # API documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
