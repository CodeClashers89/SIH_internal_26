from django.contrib import admin
from .models import EmailNotificationLog, PasswordResetToken


@admin.register(EmailNotificationLog)
class EmailNotificationLogAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'entity_type', 'entity_id', 'recipient_email', 'status', 'sent_at')
    list_filter = ('status', 'event_type', 'entity_type', 'sent_at')
    search_fields = ('event_type', 'recipient_email', 'entity_id', 'error_message')
    readonly_fields = ('event_type', 'entity_type', 'entity_id', 'recipient_email',
                       'recipient_name', 'status', 'error_message', 'sent_at')
    ordering = ('-sent_at',)

    def has_add_permission(self, request):
        return False  # Logs are immutable

    def has_change_permission(self, request, obj=None):
        return False  # Logs are immutable


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'used', 'is_valid')
    list_filter = ('used', 'created_at')
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('user', 'token_hash', 'created_at', 'expires_at', 'used')
    ordering = ('-created_at',)

    @admin.display(boolean=True, description='Valid')
    def is_valid(self, obj):
        return obj.is_valid
