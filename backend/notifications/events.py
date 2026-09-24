"""
notifications/events.py
========================
Centralized email event dispatcher for the KisanConnect platform.

This module maps business events → recipients → templates → email send.

Usage (from any view/service):
    from notifications.events import notify

    notify('ORDER_CREATED', order=order)
    notify('DRIVER_ASSIGNED', transport_offer=offer)
    notify('PASSWORD_RESET_REQUESTED', user=user, reset_url=url)

All sends are:
  1. Duplicate-protected via EmailNotificationLog
  2. Non-blocking (run in daemon thread, caller never waits for SMTP)
  3. Non-crashing (all exceptions are caught and logged)

Event constants:
    ORDER_CREATED
    ORDER_OTP_SENT
    ORDER_CANCELLED
    ORDER_STATUS_CHANGED
    CUSTOM_REQUEST_ACCEPTED
    PASSWORD_RESET_REQUESTED
    PRODUCT_FRESHNESS_ZERO
    DRIVER_TASK_ASSIGNED
    DRIVER_TASK_ACCEPTED_DRIVER
    DRIVER_TASK_ACCEPTED_FARMER
    DRIVER_TASK_REJECTED
    FARMER_NEW_ORDER
    WHOLESALE_BID_CONFIRMED
    DELIVERY_PROGRESS_CONSUMER
    DELIVERY_PROGRESS_DRIVER

    --- Bulk Buyer events ---
    WHOLESALE_FARMER_OFFER_MADE     Farmer submits offer on BulkRequirement → Bulk Buyer notified
    WHOLESALE_BID_ACCEPTED_BUYER    Bulk Buyer accepts FarmerOffer → Bulk Buyer confirmation + order
    WHOLESALE_BID_REJECTED_BUYER    Bulk Buyer rejects FarmerOffer → Farmer notified
    BULK_ORDER_STATUS_CHANGED       Order status update (confirmed/packed/in_transit/delivered) → Bulk Buyer
    BULK_ORDER_CANCELLED            Wholesale order cancelled → Bulk Buyer notified
    QUOTE_OFFER_MADE                Farmer counter-offers on QuoteRequest → Bulk Buyer notified
    QUOTE_BID_ACCEPTED_BUYER        Bulk Buyer accepts farmer counter-offer → Bulk Buyer confirmation
    QUOTE_BID_REJECTED              Either party rejects QuoteRequest → other party notified
"""

from __future__ import annotations

import logging

from .email_service import send_email
from .models import EmailNotificationLog
from . import templates as tmpl

logger = logging.getLogger('notifications.events')

# ---------------------------------------------------------------------------
# Event name constants
# ---------------------------------------------------------------------------
ORDER_CREATED               = 'ORDER_CREATED'
ORDER_OTP_SENT              = 'ORDER_OTP_SENT'
ORDER_CANCELLED             = 'ORDER_CANCELLED'
ORDER_STATUS_CHANGED        = 'ORDER_STATUS_CHANGED'
CUSTOM_REQUEST_ACCEPTED     = 'CUSTOM_REQUEST_ACCEPTED'
PASSWORD_RESET_REQUESTED    = 'PASSWORD_RESET_REQUESTED'
PRODUCT_FRESHNESS_ZERO      = 'PRODUCT_FRESHNESS_ZERO'
DRIVER_TASK_ASSIGNED        = 'DRIVER_TASK_ASSIGNED'
DRIVER_TASK_ACCEPTED_DRIVER = 'DRIVER_TASK_ACCEPTED_DRIVER'
DRIVER_TASK_ACCEPTED_FARMER = 'DRIVER_TASK_ACCEPTED_FARMER'
DRIVER_TASK_REJECTED        = 'DRIVER_TASK_REJECTED'
FARMER_NEW_ORDER            = 'FARMER_NEW_ORDER'
WHOLESALE_BID_CONFIRMED     = 'WHOLESALE_BID_CONFIRMED'
DELIVERY_PROGRESS_CONSUMER  = 'DELIVERY_PROGRESS_CONSUMER'
DELIVERY_PROGRESS_DRIVER    = 'DELIVERY_PROGRESS_DRIVER'
FARMER_ORDER_PICKED_UP      = 'FARMER_ORDER_PICKED_UP'
FARMER_ORDER_DELIVERED      = 'FARMER_ORDER_DELIVERED'

# Bulk Buyer events
WHOLESALE_FARMER_OFFER_MADE  = 'WHOLESALE_FARMER_OFFER_MADE'
WHOLESALE_BID_ACCEPTED_BUYER = 'WHOLESALE_BID_ACCEPTED_BUYER'
WHOLESALE_BID_REJECTED_BUYER = 'WHOLESALE_BID_REJECTED_BUYER'
BULK_ORDER_STATUS_CHANGED    = 'BULK_ORDER_STATUS_CHANGED'
BULK_ORDER_CANCELLED         = 'BULK_ORDER_CANCELLED'
QUOTE_OFFER_MADE             = 'QUOTE_OFFER_MADE'
QUOTE_BID_ACCEPTED_BUYER     = 'QUOTE_BID_ACCEPTED_BUYER'
QUOTE_BID_REJECTED           = 'QUOTE_BID_REJECTED'



# ---------------------------------------------------------------------------
# Internal send helper
# ---------------------------------------------------------------------------

def _dispatch(
    event_type: str,
    entity_type: str,
    entity_id,
    recipient_email: str,
    recipient_name: str,
    email_dict: dict,
    *,
    allow_duplicate: bool = False,
) -> None:
    """
    Idempotency-check → send → log.

    allow_duplicate=True bypasses the duplicate check (e.g. for OTP resend).
    All exceptions are swallowed — email MUST NOT break business transactions.
    """
    if not recipient_email:
        logger.info(
            '[NOTIFY SKIP] %s for %s#%s — no recipient email',
            event_type, entity_type, entity_id
        )
        return

    if not allow_duplicate and EmailNotificationLog.already_sent(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        recipient_email=recipient_email,
    ):
        logger.info(
            '[NOTIFY DUPLICATE] Skipping %s for %s#%s → %s (already sent)',
            event_type, entity_type, entity_id, recipient_email
        )
        EmailNotificationLog.record(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            status='skipped',
        )
        return

    try:
        success, info = send_email(
            to_email=recipient_email,
            to_name=recipient_name,
            subject=email_dict['subject'],
            html_body=email_dict['html'],
            text_body=email_dict.get('text', ''),
            async_send=True,
        )

        if success:
            EmailNotificationLog.record(
                event_type=event_type,
                entity_type=entity_type,
                entity_id=entity_id,
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                status='sent',
            )
            logger.info(
                '[NOTIFY] %s → %s (%s#%s) — %s',
                event_type, recipient_email, entity_type, entity_id, info
            )
        else:
            EmailNotificationLog.record(
                event_type=event_type,
                entity_type=entity_type,
                entity_id=entity_id,
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                status='failed',
                error_message=info,
            )
            logger.warning(
                '[NOTIFY FAILED] %s → %s: %s',
                event_type, recipient_email, info
            )

    except Exception as exc:  # noqa: BLE001
        logger.error(
            '[NOTIFY ERROR] %s for %s#%s → %s: %s',
            event_type, entity_type, entity_id, recipient_email, exc,
            exc_info=True,
        )
        EmailNotificationLog.record(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            status='failed',
            error_message=str(exc),
        )


# ---------------------------------------------------------------------------
# Public API: notify()
# ---------------------------------------------------------------------------

def notify(event: str, **kwargs) -> None:
    """
    Dispatch an email notification for the given event.

    Parameters
    ----------
    event : str
        One of the event constants defined in this module.
    **kwargs
        Event-specific keyword arguments (see per-event handlers below).

    This function never raises. All failures are logged.
    """
    try:
        _HANDLERS[event](**kwargs)
    except KeyError:
        logger.error('[NOTIFY] Unknown event: %r', event)
    except Exception as exc:  # noqa: BLE001
        logger.error('[NOTIFY HANDLER ERROR] event=%r: %s', event, exc, exc_info=True)


# ---------------------------------------------------------------------------
# Event handlers
# ---------------------------------------------------------------------------

def _on_order_created(*, order, **_):
    """ORDER_CREATED: confirmation + OTP email to consumer after payment success."""
    buyer = order.buyer
    if not buyer.email:
        return

    # Try to get the OTP from the shipment (created at this point) or skip
    shipment = getattr(order, 'shipment', None)
    if shipment and shipment.delivery_otp:
        email_dict = tmpl.order_otp_email(order=order, otp=shipment.delivery_otp, shipment=shipment)
        event = ORDER_OTP_SENT
    else:
        # Delivery OTP not yet generated — send a basic confirmation
        email_dict = tmpl.order_status_email(order=order, new_status='placed')
        event = ORDER_CREATED

    _dispatch(
        event_type=event,
        entity_type='Order',
        entity_id=order.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_order_otp_sent(*, order, otp: str, shipment=None, allow_duplicate=False, **_):
    """ORDER_OTP_SENT: delivery OTP email to consumer."""
    buyer = order.buyer
    if not buyer.email:
        return

    email_dict = tmpl.order_otp_email(order=order, otp=otp, shipment=shipment)
    _dispatch(
        event_type=ORDER_OTP_SENT,
        entity_type='Order',
        entity_id=order.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
        allow_duplicate=allow_duplicate,
    )


def _on_order_cancelled(*, order, **_):
    """ORDER_CANCELLED: email to consumer."""
    buyer = order.buyer
    if not buyer.email:
        return

    email_dict = tmpl.order_cancelled_email(order=order)
    _dispatch(
        event_type=ORDER_CANCELLED,
        entity_type='Order',
        entity_id=order.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_order_status_changed(*, order, new_status: str, **_):
    """ORDER_STATUS_CHANGED: email to consumer for each meaningful transition."""
    # Avoid sending for non-meaningful statuses
    NOTIFY_STATUSES = {'confirmed', 'packed', 'in_transit', 'delivered'}
    if new_status not in NOTIFY_STATUSES:
        return

    buyer = order.buyer
    if not buyer.email:
        return

    # Composite entity_id includes status so each transition gets its own log record
    entity_id = f"{order.id}_{new_status}"

    email_dict = tmpl.order_status_email(order=order, new_status=new_status)
    _dispatch(
        event_type=ORDER_STATUS_CHANGED,
        entity_type='Order',
        entity_id=entity_id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_custom_request_accepted(*, quote, **_):
    """CUSTOM_REQUEST_ACCEPTED: email to bulk buyer."""
    buyer = quote.buyer
    if not buyer.email:
        return

    email_dict = tmpl.custom_request_accepted_email(quote=quote)
    _dispatch(
        event_type=CUSTOM_REQUEST_ACCEPTED,
        entity_type='QuoteRequest',
        entity_id=quote.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_password_reset_requested(*, user, reset_url: str, **_):
    """PASSWORD_RESET_REQUESTED: send reset link email."""
    if not user.email:
        return

    email_dict = tmpl.password_reset_email(user=user, reset_url=reset_url)
    # Password reset is ALWAYS resendable — allow_duplicate=True
    _dispatch(
        event_type=PASSWORD_RESET_REQUESTED,
        entity_type='User',
        entity_id=user.id,
        recipient_email=user.email,
        recipient_name=user.first_name or user.username,
        email_dict=email_dict,
        allow_duplicate=True,
    )


def _on_product_freshness_zero(*, user, product, **_):
    """PRODUCT_FRESHNESS_ZERO: alert buyer once when freshness reaches 0."""
    if not user.email:
        return

    email_dict = tmpl.freshness_alert_email(user=user, product=product)
    _dispatch(
        event_type=PRODUCT_FRESHNESS_ZERO,
        entity_type='Product',
        entity_id=product.id,
        recipient_email=user.email,
        recipient_name=user.first_name or user.username,
        email_dict=email_dict,
        # allow_duplicate=False — sent ONCE per product freshness transition
    )


def _on_driver_task_assigned(*, transport_offer, **_):
    """DRIVER_TASK_ASSIGNED: email to the assigned logistics partner."""
    partner = transport_offer.partner
    driver_user = partner.user if partner else None
    recipient_email = (driver_user.email if driver_user else None) or ''
    recipient_name = (driver_user.first_name if driver_user else None) or partner.name if partner else ''

    if not recipient_email:
        return

    email_dict = tmpl.driver_task_assigned_email(transport_offer=transport_offer)
    _dispatch(
        event_type=DRIVER_TASK_ASSIGNED,
        entity_type='TransportOffer',
        entity_id=transport_offer.id,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        email_dict=email_dict,
    )


def _on_driver_task_accepted_driver(*, transport_offer, **_):
    """DRIVER_TASK_ACCEPTED_DRIVER: confirmation to the driver."""
    partner = transport_offer.partner
    driver_user = partner.user if partner else None
    recipient_email = (driver_user.email if driver_user else None) or ''
    recipient_name = (driver_user.first_name if driver_user else None) or partner.name if partner else ''

    if not recipient_email:
        return

    email_dict = tmpl.driver_accepted_confirmation_email(transport_offer=transport_offer)
    _dispatch(
        event_type=DRIVER_TASK_ACCEPTED_DRIVER,
        entity_type='TransportOffer',
        entity_id=transport_offer.id,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        email_dict=email_dict,
    )


def _on_driver_task_accepted_farmer(*, transport_offer, **_):
    """DRIVER_TASK_ACCEPTED_FARMER: notify farmer that driver accepted."""
    farmer = transport_offer.farmer
    if not farmer or not farmer.email:
        return

    email_dict = tmpl.farmer_driver_accepted_email(transport_offer=transport_offer)
    _dispatch(
        event_type=DRIVER_TASK_ACCEPTED_FARMER,
        entity_type='TransportOffer',
        entity_id=transport_offer.id,
        recipient_email=farmer.email,
        recipient_name=farmer.first_name or farmer.username,
        email_dict=email_dict,
    )


def _on_driver_task_rejected(*, transport_offer, **_):
    """DRIVER_TASK_REJECTED: notify farmer that driver rejected."""
    farmer = transport_offer.farmer
    if not farmer or not farmer.email:
        return

    email_dict = tmpl.farmer_driver_rejected_email(transport_offer=transport_offer)
    _dispatch(
        event_type=DRIVER_TASK_REJECTED,
        entity_type='TransportOffer',
        entity_id=transport_offer.id,
        recipient_email=farmer.email,
        recipient_name=farmer.first_name or farmer.username,
        email_dict=email_dict,
    )


def _on_farmer_order_picked_up(*, order, shipment, **_):
    """FARMER_ORDER_PICKED_UP: notify every farmer whose products are in this order that the package was picked up."""
    farmers_notified = set()
    for item in order.items.select_related('product__farmer').all():
        if not (item.product and item.product.farmer):
            continue
        farmer = item.product.farmer
        if farmer.id in farmers_notified or not farmer.email:
            continue
        farmers_notified.add(farmer.id)
        email_dict = tmpl.farmer_order_picked_up_email(farmer=farmer, order=order, shipment=shipment)
        _dispatch(
            event_type=FARMER_ORDER_PICKED_UP,
            entity_type='Order',
            entity_id=f"{order.id}_{farmer.id}",
            recipient_email=farmer.email,
            recipient_name=farmer.first_name or farmer.username,
            email_dict=email_dict,
        )


def _on_farmer_order_delivered(*, order, shipment, **_):
    """FARMER_ORDER_DELIVERED: notify every farmer whose products are in this order that delivery succeeded."""
    farmers_notified = set()
    for item in order.items.select_related('product__farmer').all():
        if not (item.product and item.product.farmer):
            continue
        farmer = item.product.farmer
        if farmer.id in farmers_notified or not farmer.email:
            continue
        farmers_notified.add(farmer.id)
        email_dict = tmpl.farmer_order_delivered_email(farmer=farmer, order=order, shipment=shipment)
        _dispatch(
            event_type=FARMER_ORDER_DELIVERED,
            entity_type='Order',
            entity_id=f"{order.id}_{farmer.id}",
            recipient_email=farmer.email,
            recipient_name=farmer.first_name or farmer.username,
            email_dict=email_dict,
        )


def _on_farmer_new_order(*, order, **_):
    """FARMER_NEW_ORDER: notify all farmers whose products are in this order."""
    farmers_notified = set()
    for item in order.items.all():
        if item.product and item.product.farmer:
            farmer = item.product.farmer
            if farmer.id in farmers_notified:
                continue
            farmers_notified.add(farmer.id)
            if not farmer.email:
                continue
            email_dict = tmpl.farmer_new_order_email(farmer=farmer, order=order)
            _dispatch(
                event_type=FARMER_NEW_ORDER,
                entity_type='Order',
                entity_id=f"{order.id}_{farmer.id}",
                recipient_email=farmer.email,
                recipient_name=farmer.first_name or farmer.username,
                email_dict=email_dict,
            )


def _on_wholesale_bid_confirmed(*, offer, **_):
    """WHOLESALE_BID_CONFIRMED: email to farmer when bulk buyer accepts their offer."""
    farmer = offer.farmer
    if not farmer or not farmer.email:
        return

    email_dict = tmpl.wholesale_bid_confirmed_email(farmer=farmer, offer=offer)
    _dispatch(
        event_type=WHOLESALE_BID_CONFIRMED,
        entity_type='FarmerOffer',
        entity_id=offer.id,
        recipient_email=farmer.email,
        recipient_name=farmer.first_name or farmer.username,
        email_dict=email_dict,
    )


def _on_delivery_progress_consumer(*, shipment, new_status: str, **_):
    """DELIVERY_PROGRESS_CONSUMER: email consumer about shipment status changes."""
    order = shipment.order
    buyer = order.buyer
    if not buyer.email:
        return

    entity_id = f"{shipment.id}_{new_status}"
    email_dict = tmpl.delivery_progress_email(
        user=buyer, shipment=shipment, new_status=new_status, role='consumer'
    )
    _dispatch(
        event_type=DELIVERY_PROGRESS_CONSUMER,
        entity_type='DeliveryShipment',
        entity_id=entity_id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_delivery_progress_driver(*, shipment, new_status: str, **_):
    """DELIVERY_PROGRESS_DRIVER: email driver about their task progress."""
    partner = shipment.partner
    if not partner:
        return
    driver_user = partner.user
    if not driver_user or not driver_user.email:
        return

    entity_id = f"{shipment.id}_{new_status}_driver"
    email_dict = tmpl.delivery_progress_email(
        user=driver_user, shipment=shipment, new_status=new_status, role='driver'
    )
    _dispatch(
        event_type=DELIVERY_PROGRESS_DRIVER,
        entity_type='DeliveryShipment',
        entity_id=entity_id,
        recipient_email=driver_user.email,
        recipient_name=driver_user.first_name or driver_user.username,
        email_dict=email_dict,
    )


# ---------------------------------------------------------------------------
# Bulk Buyer event handlers
# ---------------------------------------------------------------------------

def _on_wholesale_farmer_offer_made(*, offer, **_):
    """WHOLESALE_FARMER_OFFER_MADE: notify Bulk Buyer when a Farmer submits an offer on their requirement."""
    requirement = offer.requirement
    buyer = requirement.buyer
    if not buyer or not buyer.email:
        return

    email_dict = tmpl.wholesale_farmer_offer_email(bulk_buyer=buyer, offer=offer, requirement=requirement)
    _dispatch(
        event_type=WHOLESALE_FARMER_OFFER_MADE,
        entity_type='FarmerOffer',
        entity_id=offer.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_wholesale_bid_accepted_buyer(*, offer, order, **_):
    """WHOLESALE_BID_ACCEPTED_BUYER: confirm to Bulk Buyer that they accepted a FarmerOffer and an order is created."""
    requirement = offer.requirement
    buyer = requirement.buyer
    if not buyer or not buyer.email:
        return

    email_dict = tmpl.wholesale_bid_accepted_buyer_email(bulk_buyer=buyer, offer=offer, order=order)
    _dispatch(
        event_type=WHOLESALE_BID_ACCEPTED_BUYER,
        entity_type='FarmerOffer',
        entity_id=offer.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_wholesale_bid_rejected_buyer(*, offer, **_):
    """WHOLESALE_BID_REJECTED_BUYER: notify Farmer that their FarmerOffer was rejected by the Bulk Buyer."""
    farmer = offer.farmer
    if not farmer or not farmer.email:
        return

    email_dict = tmpl.wholesale_bid_rejected_farmer_email(farmer=farmer, offer=offer)
    _dispatch(
        event_type=WHOLESALE_BID_REJECTED_BUYER,
        entity_type='FarmerOffer',
        entity_id=offer.id,
        recipient_email=farmer.email,
        recipient_name=farmer.first_name or farmer.username,
        email_dict=email_dict,
    )


def _on_bulk_order_status_changed(*, order, new_status: str, **_):
    """BULK_ORDER_STATUS_CHANGED: email Bulk Buyer for meaningful wholesale order status transitions."""
    NOTIFY_STATUSES = {'confirmed', 'packed', 'in_transit', 'delivered'}
    if new_status not in NOTIFY_STATUSES:
        return

    buyer = order.buyer
    if not buyer.email:
        return

    entity_id = f"{order.id}_{new_status}_bulk"
    email_dict = tmpl.bulk_order_status_email(bulk_buyer=buyer, order=order, new_status=new_status)
    _dispatch(
        event_type=BULK_ORDER_STATUS_CHANGED,
        entity_type='Order',
        entity_id=entity_id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_bulk_order_cancelled(*, order, **_):
    """BULK_ORDER_CANCELLED: email Bulk Buyer when their wholesale order is cancelled."""
    buyer = order.buyer
    if not buyer.email:
        return

    email_dict = tmpl.bulk_order_cancelled_email(bulk_buyer=buyer, order=order)
    _dispatch(
        event_type=BULK_ORDER_CANCELLED,
        entity_type='Order',
        entity_id=order.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_quote_offer_made(*, quote, **_):
    """QUOTE_OFFER_MADE: notify Bulk Buyer when Farmer makes a counter-offer on their QuoteRequest."""
    buyer = quote.buyer
    if not buyer or not buyer.email:
        return

    email_dict = tmpl.quote_offer_made_email(bulk_buyer=buyer, quote=quote)
    _dispatch(
        event_type=QUOTE_OFFER_MADE,
        entity_type='QuoteRequest',
        entity_id=quote.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
        allow_duplicate=True,  # Farmer may update counter-offer multiple times
    )


def _on_quote_bid_accepted_buyer(*, quote, order, **_):
    """QUOTE_BID_ACCEPTED_BUYER: confirm to Bulk Buyer that they accepted a counter-offer and an order is created."""
    buyer = quote.buyer
    if not buyer or not buyer.email:
        return

    email_dict = tmpl.quote_bid_accepted_buyer_email(bulk_buyer=buyer, quote=quote, order=order)
    _dispatch(
        event_type=QUOTE_BID_ACCEPTED_BUYER,
        entity_type='QuoteRequest',
        entity_id=quote.id,
        recipient_email=buyer.email,
        recipient_name=buyer.first_name or buyer.username,
        email_dict=email_dict,
    )


def _on_quote_bid_rejected(*, quote, rejected_by: str, **_):
    """
    QUOTE_BID_REJECTED: notify the other party when a QuoteRequest is rejected.

    rejected_by: 'farmer' → buyer initiated the rejection of farmer's offer → notify farmer
                 'buyer'  → farmer declined buyer's request → notify buyer
    """
    if rejected_by == 'farmer':
        # Buyer rejected farmer's counter-offer — notify the farmer
        product = quote.product
        farmer = product.farmer if product else None
        if not farmer or not farmer.email:
            return
        email_dict = tmpl.quote_bid_rejected_email(
            recipient=farmer, quote=quote, rejected_by='buyer'
        )
        _dispatch(
            event_type=QUOTE_BID_REJECTED,
            entity_type='QuoteRequest',
            entity_id=f"{quote.id}_farmer",
            recipient_email=farmer.email,
            recipient_name=farmer.first_name or farmer.username,
            email_dict=email_dict,
        )
    else:
        # Farmer rejected buyer's request — notify the buyer
        buyer = quote.buyer
        if not buyer or not buyer.email:
            return
        email_dict = tmpl.quote_bid_rejected_email(
            recipient=buyer, quote=quote, rejected_by='farmer'
        )
        _dispatch(
            event_type=QUOTE_BID_REJECTED,
            entity_type='QuoteRequest',
            entity_id=f"{quote.id}_buyer",
            recipient_email=buyer.email,
            recipient_name=buyer.first_name or buyer.username,
            email_dict=email_dict,
        )


# ---------------------------------------------------------------------------
# Handler registry
# ---------------------------------------------------------------------------

_HANDLERS = {
    ORDER_CREATED:               _on_order_created,
    ORDER_OTP_SENT:              _on_order_otp_sent,
    ORDER_CANCELLED:             _on_order_cancelled,
    ORDER_STATUS_CHANGED:        _on_order_status_changed,
    CUSTOM_REQUEST_ACCEPTED:     _on_custom_request_accepted,
    PASSWORD_RESET_REQUESTED:    _on_password_reset_requested,
    PRODUCT_FRESHNESS_ZERO:      _on_product_freshness_zero,
    DRIVER_TASK_ASSIGNED:        _on_driver_task_assigned,
    DRIVER_TASK_ACCEPTED_DRIVER: _on_driver_task_accepted_driver,
    DRIVER_TASK_ACCEPTED_FARMER: _on_driver_task_accepted_farmer,
    DRIVER_TASK_REJECTED:        _on_driver_task_rejected,
    FARMER_NEW_ORDER:            _on_farmer_new_order,
    WHOLESALE_BID_CONFIRMED:     _on_wholesale_bid_confirmed,
    DELIVERY_PROGRESS_CONSUMER:  _on_delivery_progress_consumer,
    DELIVERY_PROGRESS_DRIVER:    _on_delivery_progress_driver,
    FARMER_ORDER_PICKED_UP:      _on_farmer_order_picked_up,
    FARMER_ORDER_DELIVERED:      _on_farmer_order_delivered,
    # Bulk Buyer events
    WHOLESALE_FARMER_OFFER_MADE:  _on_wholesale_farmer_offer_made,
    WHOLESALE_BID_ACCEPTED_BUYER: _on_wholesale_bid_accepted_buyer,
    WHOLESALE_BID_REJECTED_BUYER: _on_wholesale_bid_rejected_buyer,
    BULK_ORDER_STATUS_CHANGED:    _on_bulk_order_status_changed,
    BULK_ORDER_CANCELLED:         _on_bulk_order_cancelled,
    QUOTE_OFFER_MADE:             _on_quote_offer_made,
    QUOTE_BID_ACCEPTED_BUYER:     _on_quote_bid_accepted_buyer,
    QUOTE_BID_REJECTED:           _on_quote_bid_rejected,
}

