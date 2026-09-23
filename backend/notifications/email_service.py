"""
notifications/email_service.py
================================
Centralized Brevo SMTP email sender for the KisanConnect platform.

Supports:
 - Brevo SMTP (primary) via Django's EmailMultiAlternatives
 - Console backend for local development (EMAIL_PROVIDER=console)
 - Async / non-blocking delivery using a daemon thread
 - Structured logging (never logs credentials / OTPs / tokens)
 - Hard-disabled during automated tests (EMAIL_ENABLED=false)

Environment variables consumed (see .env.example):
    BREVO_SMTP_HOST          smtp-relay.brevo.com
    BREVO_SMTP_PORT          587
    BREVO_SMTP_USERNAME      <your Brevo login email>
    BREVO_SMTP_PASSWORD      <your Brevo SMTP key>
    BREVO_FROM_EMAIL         noreply@yourdomain.com
    BREVO_FROM_NAME          KisanConnect Platform
    EMAIL_ENABLED            true   (set false to fully disable)
    EMAIL_PROVIDER           brevo  (or 'console' for dev)
    EMAIL_DEBUG              false
"""

from __future__ import annotations

import logging
import os
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib

from django.conf import settings

logger = logging.getLogger('notifications.email')

# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _get(env_key: str, setting_key: str | None = None, default: str = '') -> str:
    """Read from environment first, then Django settings, then default."""
    val = os.environ.get(env_key, '')
    if val:
        return val.strip()
    if setting_key:
        val = getattr(settings, setting_key, '') or ''
        if val:
            return str(val).strip()
    return default


def _email_enabled() -> bool:
    raw = os.environ.get('EMAIL_ENABLED', 'true').lower()
    return raw in ('1', 'true', 'yes')


def _email_provider() -> str:
    return os.environ.get('EMAIL_PROVIDER', 'brevo').lower()


def _email_debug() -> bool:
    raw = os.environ.get('EMAIL_DEBUG', 'false').lower()
    return raw in ('1', 'true', 'yes')


def _smtp_config() -> dict:
    return {
        'host': _get('BREVO_SMTP_HOST', 'EMAIL_HOST', 'smtp-relay.brevo.com'),
        'port': int(os.environ.get('BREVO_SMTP_PORT', os.environ.get('EMAIL_PORT', '587'))),
        'username': _get('BREVO_SMTP_USERNAME', 'EMAIL_HOST_USER', ''),
        'password': _get('BREVO_SMTP_PASSWORD', 'EMAIL_HOST_PASSWORD', ''),
        'use_tls': True,
        'from_email': _get('BREVO_FROM_EMAIL', 'BREVO_SENDER_EMAIL', 'noreply@kisanconnect.in'),
        'from_name': _get('BREVO_FROM_NAME', 'BREVO_SENDER_NAME', 'KisanConnect Platform'),
    }


# ---------------------------------------------------------------------------
# Core sender
# ---------------------------------------------------------------------------

def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_body: str,
    text_body: str = '',
    *,
    async_send: bool = True,
) -> tuple[bool, str]:
    """
    Send a single email.

    Parameters
    ----------
    to_email    : Recipient email address
    to_name     : Recipient display name
    subject     : Email subject line
    html_body   : Full HTML content of the email
    text_body   : Plain-text fallback (auto-generated from subject if empty)
    async_send  : If True (default), sends in a daemon thread so the caller
                  is never blocked by SMTP latency or failures.

    Returns
    -------
    (success: bool, info: str)
        Always returns a tuple.  If async_send=True, returns (True, 'queued')
        immediately; actual delivery happens in background.
    """
    if not _email_enabled():
        logger.info('[EMAIL DISABLED] Skipped sending to %s — EMAIL_ENABLED=false', to_email)
        return False, 'Email disabled'

    if not to_email or '@' not in to_email:
        logger.warning('[EMAIL] Invalid recipient email: %r', to_email)
        return False, f'Invalid email address: {to_email}'

    if not text_body:
        text_body = f'KisanConnect Notification\n\nSubject: {subject}\n\nPlease view this email in an HTML-capable client.'

    if async_send:
        t = threading.Thread(
            target=_do_send,
            args=(to_email, to_name, subject, html_body, text_body),
            daemon=True,
        )
        t.start()
        return True, 'queued'

    return _do_send(to_email, to_name, subject, html_body, text_body)


def _do_send(
    to_email: str,
    to_name: str,
    subject: str,
    html_body: str,
    text_body: str,
) -> tuple[bool, str]:
    """Blocking SMTP send. Called directly or from a daemon thread."""
    provider = _email_provider()

    if provider == 'console':
        _console_send(to_email, to_name, subject, html_body)
        return True, 'console'

    cfg = _smtp_config()
    from_addr = f"{cfg['from_name']} <{cfg['from_email']}>"
    to_addr = f"{to_name} <{to_email}>" if to_name else to_email

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = from_addr
    msg['To'] = to_addr
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    if not cfg['username'] or not cfg['password']:
        logger.warning(
            '[EMAIL] BREVO_SMTP_USERNAME or BREVO_SMTP_PASSWORD not configured. '
            'Email to %s was NOT sent.', to_email
        )
        return False, 'BREVO SMTP credentials not configured'

    try:
        with smtplib.SMTP(cfg['host'], cfg['port'], timeout=20) as server:
            if _email_debug():
                server.set_debuglevel(1)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg['username'], cfg['password'])
            server.sendmail(cfg['from_email'], [to_email], msg.as_bytes())

        logger.info('[EMAIL SENT] %s → %s (subject: %s)', cfg['from_email'], to_email, subject)
        return True, to_email

    except smtplib.SMTPAuthenticationError:
        logger.error(
            '[EMAIL AUTH ERROR] SMTP authentication failed for Brevo. '
            'Check BREVO_SMTP_USERNAME and BREVO_SMTP_PASSWORD. '
            'Recipient: %s', to_email
        )
        return False, 'SMTP authentication failed'
    except smtplib.SMTPException as exc:
        logger.error('[EMAIL SMTP ERROR] Failed to send to %s: %s', to_email, type(exc).__name__)
        return False, f'SMTP error: {type(exc).__name__}'
    except OSError as exc:
        logger.error('[EMAIL NETWORK ERROR] Failed to send to %s: %s', to_email, exc)
        return False, f'Network error: {exc}'
    except Exception as exc:  # noqa: BLE001
        logger.error('[EMAIL UNEXPECTED ERROR] %s → %s: %s', to_email, type(exc).__name__, exc)
        return False, str(exc)


def _console_send(to_email: str, to_name: str, subject: str, html_body: str) -> None:
    """
    Development mode: print email to console instead of sending via SMTP.
    """
    sep = '─' * 70
    print(f'\n{sep}')
    print(f'[EMAIL CONSOLE] To: {to_name} <{to_email}>')
    print(f'[EMAIL CONSOLE] Subject: {subject}')
    print(f'[EMAIL CONSOLE] Body: (HTML — {len(html_body)} chars)')
    print(sep)
