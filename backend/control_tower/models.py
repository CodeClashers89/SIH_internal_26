from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class SLADefinition(models.Model):
    entity_type = models.CharField(max_length=50) # e.g., 'order', 'shipment'
    sla_type = models.CharField(max_length=100) # e.g., 'pickup_time', 'supplier_confirmation'
    max_hours = models.FloatField()
    
    def __str__(self):
        return f"{self.entity_type} - {self.sla_type} ({self.max_hours}h)"

class OperationalEvent(models.Model):
    event_type = models.CharField(max_length=100) # e.g., ORDER_CREATED, SUPPLY_CONFIRMED
    entity_type = models.CharField(max_length=50) # e.g., order, shipment, vehicle
    entity_id = models.CharField(max_length=50)
    actor_id = models.CharField(max_length=50, null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    location = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.event_type} on {self.entity_type} {self.entity_id}"

class ControlTowerException(models.Model):
    PRIORITY_CHOICES = (
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    )
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('resolved', 'Resolved'),
    )

    type = models.CharField(max_length=100) # e.g., SUPPLY_SHORTAGE, VEHICLE_UNAVAILABLE
    severity = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    description = models.TextField()
    affected_quantity = models.FloatField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)
    assigned_operator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_exceptions')
    resolution_action = models.CharField(max_length=255, null=True, blank=True)
    resolution_notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.severity} - {self.type} on {self.entity_type} {self.entity_id}"
