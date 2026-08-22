from django.contrib import admin
from route_planning.models import RoutePlan, RouteAuditEvent


@admin.register(RoutePlan)
class RoutePlanAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "shipment",
        "route_version",
        "distance_km",
        "duration_minutes",
        "weather_risk",
        "quality_risk",
        "selection_method",
        "status",
        "is_active",
        "created_at",
    )
    list_filter = ("status", "is_active", "weather_risk", "quality_risk", "selection_method")
    search_fields = ("shipment__id", "shipment__order__id", "llm_reason")
    raw_id_fields = ("shipment", "created_by", "confirmed_by")


@admin.register(RouteAuditEvent)
class RouteAuditEventAdmin(admin.ModelAdmin):
    list_display = ("id", "route_plan", "event_type", "actor", "route_version", "timestamp")
    list_filter = ("event_type",)
    search_fields = ("route_plan__id", "reason")
