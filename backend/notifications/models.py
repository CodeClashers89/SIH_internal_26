"""
notifications/models.py
========================
Database models for the KisanConnect email notification system.

EmailNotificationLog  — idempotency / duplicate-email protection
PasswordResetToken    — secure, expiring, single-use password-reset tokens
"""

import hashlib
import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta


# ---------------------------------------------------------------------------
# Email Notification Log
# ---------------------------------------------------------------------------

class EmailNotificationLog(models.Model):
    """
    Tracks every email event that has been dispatched (or attempted).

    Used to prevent duplicate emails when:
    - API requests are retried
    - Page refreshes trigger re-render
    - Webhooks are retried
    - Background jobs re-run

    Idempotency key: (event_type, entity_type, entity_id, recipient_email)
    """

    STATUS_CHOICES = (
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped (Duplicate)'),
    )

    # What kind of notification
    event_type = models.CharField(max_length=60, db_index=True)

    # Which object triggered it (order, shipment, offer, etc.)
    entity_type = models.CharField(max_length=60, db_index=True)
    entity_id = models.CharField(max_length=40, db_index=True)

    # Who received it
    recipient_email = models.EmailField(db_index=True)
    recipient_name = models.CharField(max_length=150, blank=True, default='')

    # Delivery result
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='sent', db_index=True)
    error_message = models.TextField(blank=True, default='')

    # Timing
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        # Fast uniqueness check before send
        indexes = [
            models.Index(
                fields=['event_type', 'entity_type', 'entity_id', 'recipient_email'],
                name='notif_idempotency_idx',
            ),
        ]
        ordering = ['-sent_at']
        verbose_name = 'Email Notification Log'
        verbose_name_plural = 'Email Notification Logs'

    def __str__(self):
        return (
            f"[{self.status.upper()}] {self.event_type} → {self.recipient_email} "
            f"({self.entity_type}#{self.entity_id}) @ {self.sent_at:%Y-%m-%d %H:%M}"
        )

    @classmethod
    def already_sent(cls, event_type, entity_type, entity_id, recipient_email):
        """
        Returns True if a *successful* notification has already been sent
        for this (event, entity, recipient) combination.
        """
        return cls.objects.filter(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=str(entity_id),
            recipient_email=recipient_email,
            status='sent',
        ).exists()

    @classmethod
    def record(cls, event_type, entity_type, entity_id, recipient_email,
               recipient_name='', status='sent', error_message=''):
        """Create a log entry. Always safe to call — never raises."""
        try:
            cls.objects.create(
                event_type=event_type,
                entity_type=entity_type,
                entity_id=str(entity_id),
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                status=status,
                error_message=error_message,
            )
        except Exception:
            pass  # Never let logging kill the business transaction


# ---------------------------------------------------------------------------
# Password Reset Token
# ---------------------------------------------------------------------------

PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 15


class PasswordResetToken(models.Model):
    """
    Secure, single-use, expiring password-reset token sent via email.

    The raw token is sent to the user's email inside the reset URL.
    The database stores only a SHA-256 hash — the raw value is never persisted.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_reset_tokens',
    )

    # SHA-256 hash of the raw token (raw token is only in the email link)
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)

    # Lifecycle
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'

    def __str__(self):
        status = 'used' if self.used else ('expired' if self.is_expired else 'valid')
        return f"PasswordResetToken for {self.user.email} [{status}]"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.used and not self.is_expired

    @classmethod
    def _hash(cls, raw_token):
        return hashlib.sha256(raw_token.encode()).hexdigest()

    @classmethod
    def create_for_user(cls, user):
        """
        Invalidate all prior tokens for this user and create a fresh one.

        Returns
        -------
        raw_token : str
            The URL-safe token to embed in the reset link.
            **Never stored in the database.**
        """
        # Invalidate prior tokens (mark as used so they can't be replayed)
        cls.objects.filter(user=user, used=False).update(used=True)

        raw_token = secrets.token_urlsafe(32)
        cls.objects.create(
            user=user,
            token_hash=cls._hash(raw_token),
            expires_at=timezone.now() + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRY_MINUTES),
        )
        return raw_token

    @classmethod
    def consume(cls, raw_token):
        """
        Validate and consume a password-reset token.

        Returns
        -------
        user : User instance if valid, else None
        error : str describing the problem, or None on success
        """
        token_hash = cls._hash(raw_token)
        try:
            token_obj = cls.objects.select_related('user').get(token_hash=token_hash)
        except cls.DoesNotExist:
            return None, 'Invalid or expired password reset link.'

        if token_obj.used:
            return None, 'This password reset link has already been used.'

        if token_obj.is_expired:
            return None, (
                f'This password reset link has expired '
                f'(valid for {PASSWORD_RESET_TOKEN_EXPIRY_MINUTES} minutes). '
                f'Please request a new one.'
            )

        # Mark consumed — prevents replay
        token_obj.used = True
        token_obj.save(update_fields=['used'])

        return token_obj.user, None
