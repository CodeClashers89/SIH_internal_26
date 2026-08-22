from django.db import models
from django.conf import settings
from logistics.models import DeliveryShipment


class RoutePlan(models.Model):
    """
    Single authoritative route object consumed by both Driver and Farmer dashboards.
    Every shipment may have multiple versions; only one is active at a time.
    """

    ROUTE_STATUS_CHOICES = [
        ("GENERATED", "Generated"),
        ("ANALYZING", "Analyzing"),
        ("RECOMMENDED", "Recommended"),
        ("AWAITING_CONFIRMATION", "Awaiting Confirmation"),
        ("CONFIRMED", "Confirmed"),
        ("ACTIVE", "Active"),
        ("RECALCULATION_REQUIRED", "Recalculation Required"),
        ("SUPERSEDED", "Superseded"),
        ("COMPLETED", "Completed"),
    ]

    RISK_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
        ("UNKNOWN", "Unknown"),
    ]

    SELECTION_METHOD_CHOICES = [
        ("llm_recommendation", "LLM Recommendation"),
        ("deterministic_fallback", "Deterministic Fallback"),
        ("operator_override", "Operator Override"),
    ]

    shipment = models.ForeignKey(
        DeliveryShipment,
        on_delete=models.CASCADE,
        related_name="route_plans"
    )
    route_version = models.IntegerField(default=1)

    route_geometry = models.JSONField(default=list)
    candidate_routes = models.JSONField(default=list)
    distance_km = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    duration_minutes = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    estimated_departure = models.DateTimeField(null=True, blank=True)
    estimated_arrival = models.DateTimeField(null=True, blank=True)

    weather_risk = models.CharField(max_length=10, choices=RISK_CHOICES, default="UNKNOWN")
    quality_risk = models.CharField(max_length=10, choices=RISK_CHOICES, default="UNKNOWN")

    weather_snapshot = models.JSONField(default=list)
    commodity_sop_data = models.JSONField(default=dict)

    selection_method = models.CharField(max_length=30, choices=SELECTION_METHOD_CHOICES, default="deterministic_fallback")
    llm_reason = models.TextField(blank=True, null=True)
    llm_confidence = models.CharField(max_length=20, blank=True, null=True)

    status = models.CharField(max_length=30, choices=ROUTE_STATUS_CHOICES, default="GENERATED")
    is_active = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="created_route_plans"
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="confirmed_route_plans"
    )

    class Meta:
        ordering = ["-route_version"]

    def __str__(self):
        return f"RoutePlan v{self.route_version} for Shipment #{self.shipment_id} [{self.status}]"

    def supersede(self):
        self.status = "SUPERSEDED"
        self.is_active = False
        self.save(update_fields=["status", "is_active"])


class RouteAuditEvent(models.Model):
    EVENT_CHOICES = [
        ("GENERATED", "Generated"),
        ("RECOMMENDED", "Recommended"),
        ("CONFIRMED", "Confirmed"),
        ("ACTIVATED", "Activated"),
        ("RECALCULATED", "Recalculated"),
        ("SUPERSEDED", "Superseded"),
        ("COMPLETED", "Completed"),
        ("ROUTE_CHANGE_REQUESTED", "Route Change Requested"),
        ("LLM_FAILED", "LLM Failed Fallback Used"),
    ]

    route_plan = models.ForeignKey(RoutePlan, on_delete=models.CASCADE, related_name="audit_events")
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="route_audit_events"
    )
    route_version = models.IntegerField()
    reason = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.event_type} RoutePlan #{self.route_plan_id} v{self.route_version}"
