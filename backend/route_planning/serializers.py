from rest_framework import serializers
from route_planning.models import RoutePlan, RouteAuditEvent


class RouteAuditEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)

    class Meta:
        model = RouteAuditEvent
        fields = (
            "id",
            "event_type",
            "actor",
            "actor_username",
            "route_version",
            "reason",
            "metadata",
            "timestamp",
        )


class RoutePlanSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    confirmed_by_username = serializers.CharField(source="confirmed_by.username", read_only=True, default=None)
    audit_events = RouteAuditEventSerializer(many=True, read_only=True)

    # Human readable formatted metrics
    duration_hours_formatted = serializers.SerializerMethodField(method_name="get_duration_formatted")

    class Meta:
        model = RoutePlan
        fields = (
            "id",
            "shipment",
            "route_version",
            "route_geometry",
            "candidate_routes",
            "distance_km",
            "duration_minutes",
            "duration_hours_formatted",
            "estimated_departure",
            "estimated_arrival",
            "weather_risk",
            "quality_risk",
            "weather_snapshot",
            "commodity_sop_data",
            "selection_method",
            "llm_reason",
            "llm_confidence",
            "status",
            "is_active",
            "created_at",
            "created_by",
            "created_by_username",
            "confirmed_at",
            "confirmed_by",
            "confirmed_by_username",
            "audit_events",
        )
        read_only_fields = ("id", "created_at", "route_version")

    def get_duration_formatted(self, obj):
        if not obj.duration_minutes:
            return "0m"
        total_mins = int(obj.duration_minutes)
        hrs = total_mins // 60
        mins = total_mins % 60
        if hrs > 0:
            return f"{hrs}h {mins}m"
        return f"{mins}m"
