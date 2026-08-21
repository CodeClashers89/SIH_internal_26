from django.contrib import admin
from .models import Review

class ReviewAdmin(admin.ModelAdmin):
    list_display = ['reviewer', 'farmer', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['reviewer__username', 'farmer__username', 'comment']

admin.site.register(Review, ReviewAdmin)
