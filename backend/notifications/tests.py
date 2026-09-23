"""
notifications/tests.py
========================
Comprehensive test suite for the KisanConnect email notification system.

Tests cover:
  - EmailNotificationLog idempotency
  - PasswordResetToken lifecycle
  - Every email event dispatch
  - Missing/invalid email addresses
  - Duplicate protection
  - Password reset token expiration
  - Template rendering (all 13 templates)
  - Email disabled mode
  - Brevo SMTP credential checking

Run with:
    python manage.py test notifications
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch, PropertyMock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from notifications.models import EmailNotificationLog, PasswordResetToken
from notifications.events import notify
from notifications import events as ev
from notifications import templates as tmpl
from notifications.email_service import send_email, _smtp_config

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(username, role='consumer', email=None):
    u = User.objects.create_user(
        username=username,
        password='testpass123',
        role=role,
        email=email or f'{username}@test.kisanconnect.in',
        first_name=username.title(),
    )
    return u


def _mock_product(name='Tomato', category='vegetables', freshness=0):
    p = MagicMock()
    p.id = 1
    p.name = name
    p.category = category
    p.unit = 'kg'
    p.harvest_date = timezone.now().date() - timedelta(days=5)
    p.expiry_date = timezone.now().date() + timedelta(days=1)
    p.freshness_percentage = freshness
    return p


def _mock_order(buyer, order_id=1, status='placed', payment_status='paid'):
    order = MagicMock()
    order.id = order_id
    order.buyer = buyer
    order.status = status
    order.payment_status = payment_status
    order.shipping_address = '123 Farm Lane, Village'
    order.shipping_charge = Decimal('42.00')
    order.total_amount = Decimal('342.00')
    order.cancellation_reason = ''
    item = MagicMock()
    item.product = MagicMock()
    item.product.name = 'Tomato'
    item.product.unit = 'kg'
    item.product.farmer = MagicMock()
    item.product.farmer.id = 99
    item.product.farmer.email = 'farmer@test.kisanconnect.in'
    item.product.farmer.username = 'testfarmer'
    item.product.farmer.first_name = 'Farmer'
    item.quantity = Decimal('2')
    item.price = Decimal('150')
    order.items.all.return_value = [item]
    return order


def _mock_shipment(order, shipment_id=1, status='assigned'):
    partner = MagicMock()
    partner.id = 1
    partner.name = 'Raju Logistics'
    partner.phone = '+91 98765 43210'
    partner.user = MagicMock()
    partner.user.email = 'driver@test.kisanconnect.in'
    partner.user.username = 'testdriver'
    partner.user.first_name = 'Driver'

    shipment = MagicMock()
    shipment.id = shipment_id
    shipment.order = order
    shipment.partner = partner
    shipment.status = status
    shipment.delivery_otp = '987654'
    shipment.pickup_address = 'Farm Plot 7, Nashik'
    shipment.delivery_address = '456 Consumer Street'
    shipment.distance_km = Decimal('17.5')
    return shipment


def _mock_transport_offer(shipment, farmer, partner, offer_id=1, status='pending'):
    offer = MagicMock()
    offer.id = offer_id
    offer.shipment = shipment
    offer.farmer = farmer
    offer.partner = partner
    offer.status = status
    offer.message = 'Please deliver my order.'
    return offer


def _mock_farmer_offer(farmer, requirement_id=1, offer_id=1):
    offer = MagicMock()
    offer.id = offer_id
    offer.farmer = farmer
    offer.quantity = Decimal('100')
    offer.price_per_unit = Decimal('35')
    offer.delivery_date = timezone.now().date() + timedelta(days=3)

    req = MagicMock()
    req.id = requirement_id
    req.crop_name = 'Tomato'
    req.unit = 'kg'
    buyer = MagicMock()
    buyer.username = 'bulkbuyer'
    buyer.first_name = 'Bulk'
    req.buyer = buyer
    offer.requirement = req
    return offer


# ---------------------------------------------------------------------------
# 1. EmailNotificationLog Tests
# ---------------------------------------------------------------------------

class TestEmailNotificationLog(TestCase):

    def test_record_and_already_sent(self):
        EmailNotificationLog.record(
            event_type='TEST_EVENT',
            entity_type='Order',
            entity_id='42',
            recipient_email='user@test.com',
            status='sent',
        )
        self.assertTrue(
            EmailNotificationLog.already_sent('TEST_EVENT', 'Order', '42', 'user@test.com')
        )

    def test_not_sent_returns_false(self):
        self.assertFalse(
            EmailNotificationLog.already_sent('TEST_EVENT', 'Order', '999', 'nobody@test.com')
        )

    def test_failed_status_does_not_block_resend(self):
        EmailNotificationLog.record(
            event_type='TEST_EVENT',
            entity_type='Order',
            entity_id='55',
            recipient_email='retry@test.com',
            status='failed',
        )
        # failed log entry must NOT count as "already sent"
        self.assertFalse(
            EmailNotificationLog.already_sent('TEST_EVENT', 'Order', '55', 'retry@test.com')
        )

    def test_str_representation(self):
        log = EmailNotificationLog.record(
            event_type='ORDER_CREATED',
            entity_type='Order',
            entity_id='1',
            recipient_email='x@test.com',
            status='sent',
        )
        # record() returns None but the object is in DB; test via model
        obj = EmailNotificationLog.objects.last()
        self.assertIn('ORDER_CREATED', str(obj))


# ---------------------------------------------------------------------------
# 2. PasswordResetToken Tests
# ---------------------------------------------------------------------------

class TestPasswordResetToken(TestCase):

    def setUp(self):
        self.user = make_user('resetuser', email='reset@test.com')

    def test_token_creation(self):
        raw = PasswordResetToken.create_for_user(self.user)
        self.assertIsInstance(raw, str)
        self.assertGreater(len(raw), 20)

    def test_token_consume_valid(self):
        raw = PasswordResetToken.create_for_user(self.user)
        user_back, error = PasswordResetToken.consume(raw)
        self.assertIsNone(error)
        self.assertEqual(user_back.id, self.user.id)

    def test_token_not_reusable(self):
        raw = PasswordResetToken.create_for_user(self.user)
        PasswordResetToken.consume(raw)
        user_back, error = PasswordResetToken.consume(raw)
        self.assertIsNone(user_back)
        self.assertIn('already been used', error)

    def test_token_expired(self):
        raw = PasswordResetToken.create_for_user(self.user)
        # Force expiry
        token_obj = PasswordResetToken.objects.get(user=self.user)
        token_obj.expires_at = timezone.now() - timedelta(minutes=1)
        token_obj.save()
        user_back, error = PasswordResetToken.consume(raw)
        self.assertIsNone(user_back)
        self.assertIn('expired', error)

    def test_invalid_token(self):
        user_back, error = PasswordResetToken.consume('completely-wrong-token-xyz')
        self.assertIsNone(user_back)
        self.assertIn('Invalid', error)

    def test_old_tokens_invalidated_on_new_creation(self):
        raw1 = PasswordResetToken.create_for_user(self.user)
        raw2 = PasswordResetToken.create_for_user(self.user)
        # raw1 should now be used (invalidated)
        user_back, error = PasswordResetToken.consume(raw1)
        self.assertIsNone(user_back)

        # raw2 should still work
        user_back2, error2 = PasswordResetToken.consume(raw2)
        self.assertIsNotNone(user_back2)


# ---------------------------------------------------------------------------
# 3. Template Rendering Tests
# ---------------------------------------------------------------------------

class TestEmailTemplates(TestCase):

    def setUp(self):
        self.buyer = make_user('buyer1', role='consumer')
        self.farmer = make_user('farmer1', role='farmer')
        self.order = _mock_order(self.buyer)
        self.shipment = _mock_shipment(self.order)
        self.partner = self.shipment.partner
        self.transport_offer = _mock_transport_offer(self.shipment, self.farmer, self.partner)

    def _assert_template(self, result):
        self.assertIn('subject', result)
        self.assertIn('html', result)
        self.assertIn('text', result)
        self.assertTrue(result['subject'])
        self.assertIn('KisanConnect', result['html'])
        self.assertIn('<!DOCTYPE html>', result['html'])

    def test_order_otp_email(self):
        result = tmpl.order_otp_email(order=self.order, otp='123456', shipment=self.shipment)
        self._assert_template(result)
        self.assertIn('123456', result['html'])
        self.assertIn('123456', result['text'])

    def test_order_cancelled_email(self):
        result = tmpl.order_cancelled_email(order=self.order)
        self._assert_template(result)
        self.assertIn('Cancelled', result['subject'])

    def test_order_status_email_all_statuses(self):
        for st in ['confirmed', 'packed', 'in_transit', 'delivered']:
            result = tmpl.order_status_email(order=self.order, new_status=st)
            self._assert_template(result)

    def test_custom_request_accepted_email(self):
        quote = MagicMock()
        quote.id = 1
        quote.buyer = self.buyer
        quote.quantity = Decimal('50')
        quote.target_price = Decimal('40')
        quote.offered_price = Decimal('38')
        product = MagicMock()
        product.name = 'Tomato'
        product.unit = 'kg'
        product.farmer = self.farmer
        quote.product = product
        result = tmpl.custom_request_accepted_email(quote=quote)
        self._assert_template(result)
        self.assertIn('Accepted', result['subject'])

    def test_password_reset_email(self):
        result = tmpl.password_reset_email(user=self.buyer, reset_url='https://example.com/reset?token=abc')
        self._assert_template(result)
        self.assertIn('reset', result['subject'].lower())
        self.assertIn('https://example.com/reset', result['html'])

    def test_freshness_alert_email(self):
        product = _mock_product(freshness=0)
        result = tmpl.freshness_alert_email(user=self.buyer, product=product)
        self._assert_template(result)
        self.assertIn('0%', result['html'])

    def test_farmer_new_order_email(self):
        result = tmpl.farmer_new_order_email(farmer=self.farmer, order=self.order)
        self._assert_template(result)
        self.assertIn('New Customer Order', result['subject'])

    def test_wholesale_bid_confirmed_email(self):
        offer = _mock_farmer_offer(self.farmer)
        result = tmpl.wholesale_bid_confirmed_email(farmer=self.farmer, offer=offer)
        self._assert_template(result)
        self.assertIn('Confirmed', result['subject'])

    def test_driver_task_assigned_email(self):
        result = tmpl.driver_task_assigned_email(transport_offer=self.transport_offer)
        self._assert_template(result)
        self.assertIn('Assigned', result['subject'])

    def test_driver_accepted_confirmation_email(self):
        result = tmpl.driver_accepted_confirmation_email(transport_offer=self.transport_offer)
        self._assert_template(result)

    def test_farmer_driver_accepted_email(self):
        result = tmpl.farmer_driver_accepted_email(transport_offer=self.transport_offer)
        self._assert_template(result)

    def test_farmer_driver_rejected_email(self):
        result = tmpl.farmer_driver_rejected_email(transport_offer=self.transport_offer)
        self._assert_template(result)

    def test_delivery_progress_email_consumer(self):
        for st in ['assigned', 'picked_up', 'handover_completed', 'delivered']:
            result = tmpl.delivery_progress_email(
                user=self.buyer, shipment=self.shipment, new_status=st, role='consumer'
            )
            self._assert_template(result)

    def test_delivery_progress_email_driver(self):
        result = tmpl.delivery_progress_email(
            user=self.farmer, shipment=self.shipment, new_status='picked_up', role='driver'
        )
        self._assert_template(result)


# ---------------------------------------------------------------------------
# 4. Event Dispatch Tests (with SMTP mocked)
# ---------------------------------------------------------------------------

@override_settings(EMAIL_ENABLED='true')
class TestEventDispatch(TestCase):
    """
    Tests that the correct event triggers the correct email to the correct recipient.
    SMTP is fully mocked — no real emails are sent.
    """

    def setUp(self):
        self.buyer = make_user('buyer2', role='consumer', email='buyer2@test.com')
        self.farmer = make_user('farmer2', role='farmer', email='farmer2@test.com')
        self.driver = make_user('driver2', role='logistics_partner', email='driver2@test.com')
        self.order = _mock_order(self.buyer, order_id=100)
        self.shipment = _mock_shipment(self.order, shipment_id=10)
        self.transport_offer = _mock_transport_offer(self.shipment, self.farmer, self.shipment.partner)

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_order_cancelled_sends_to_buyer(self, mock_send):
        notify(ev.ORDER_CANCELLED, order=self.order)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.ORDER_CANCELLED,
                recipient_email=self.buyer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_order_status_confirmed_sends_to_buyer(self, mock_send):
        notify(ev.ORDER_STATUS_CHANGED, order=self.order, new_status='confirmed')
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.ORDER_STATUS_CHANGED,
                recipient_email=self.buyer.email,
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_order_status_placed_not_sent(self, mock_send):
        """'placed' status should NOT trigger an email."""
        notify(ev.ORDER_STATUS_CHANGED, order=self.order, new_status='placed')
        self.assertFalse(
            EmailNotificationLog.objects.filter(
                event_type=ev.ORDER_STATUS_CHANGED,
                recipient_email=self.buyer.email,
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_farmer_new_order_email(self, mock_send):
        notify(ev.FARMER_NEW_ORDER, order=self.order)
        # The mock_order has a farmer item with farmer@test.kisanconnect.in
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.FARMER_NEW_ORDER,
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_wholesale_bid_confirmed(self, mock_send):
        offer = _mock_farmer_offer(self.farmer)
        offer.farmer = self.farmer
        notify(ev.WHOLESALE_BID_CONFIRMED, offer=offer)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.WHOLESALE_BID_CONFIRMED,
                recipient_email=self.farmer.email,
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_driver_task_assigned(self, mock_send):
        notify(ev.DRIVER_TASK_ASSIGNED, transport_offer=self.transport_offer)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.DRIVER_TASK_ASSIGNED,
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_driver_accepted_sends_two_emails(self, mock_send):
        notify(ev.DRIVER_TASK_ACCEPTED_DRIVER, transport_offer=self.transport_offer)
        notify(ev.DRIVER_TASK_ACCEPTED_FARMER, transport_offer=self.transport_offer)
        self.assertTrue(
            EmailNotificationLog.objects.filter(event_type=ev.DRIVER_TASK_ACCEPTED_DRIVER).exists()
        )
        self.assertTrue(
            EmailNotificationLog.objects.filter(event_type=ev.DRIVER_TASK_ACCEPTED_FARMER).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_driver_rejected_notifies_farmer(self, mock_send):
        notify(ev.DRIVER_TASK_REJECTED, transport_offer=self.transport_offer)
        self.assertTrue(
            EmailNotificationLog.objects.filter(event_type=ev.DRIVER_TASK_REJECTED).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_delivery_progress_consumer(self, mock_send):
        notify(ev.DELIVERY_PROGRESS_CONSUMER, shipment=self.shipment, new_status='picked_up')
        self.assertTrue(
            EmailNotificationLog.objects.filter(event_type=ev.DELIVERY_PROGRESS_CONSUMER).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_product_freshness_zero(self, mock_send):
        product = _mock_product(freshness=0)
        notify(ev.PRODUCT_FRESHNESS_ZERO, user=self.buyer, product=product)
        self.assertTrue(
            EmailNotificationLog.objects.filter(event_type=ev.PRODUCT_FRESHNESS_ZERO).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_freshness_duplicate_protection(self, mock_send):
        """Freshness alert sent ONCE per product, even if event triggered twice."""
        product = _mock_product(freshness=0)
        notify(ev.PRODUCT_FRESHNESS_ZERO, user=self.buyer, product=product)
        notify(ev.PRODUCT_FRESHNESS_ZERO, user=self.buyer, product=product)  # second call
        sent = EmailNotificationLog.objects.filter(
            event_type=ev.PRODUCT_FRESHNESS_ZERO,
            status='sent',
        ).count()
        skipped = EmailNotificationLog.objects.filter(
            event_type=ev.PRODUCT_FRESHNESS_ZERO,
            status='skipped',
        ).count()
        self.assertEqual(sent, 1)
        self.assertEqual(skipped, 1)

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_no_email_skipped_gracefully(self, mock_send):
        """If buyer has no email, event should be silently skipped (no crash)."""
        buyer_no_email = make_user('noemail_buyer', email='')
        buyer_no_email.email = ''
        order = _mock_order(buyer_no_email)
        try:
            notify(ev.ORDER_CANCELLED, order=order)
        except Exception as e:
            self.fail(f"notify() raised exception for missing email: {e}")

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_password_reset_always_resendable(self, mock_send):
        """Password reset emails must always be resendable (allow_duplicate=True)."""
        url = 'https://kisanconnect.in/reset?token=abc'
        notify(ev.PASSWORD_RESET_REQUESTED, user=self.buyer, reset_url=url)
        notify(ev.PASSWORD_RESET_REQUESTED, user=self.buyer, reset_url=url)
        sent_count = EmailNotificationLog.objects.filter(
            event_type=ev.PASSWORD_RESET_REQUESTED,
            status='sent',
        ).count()
        self.assertEqual(sent_count, 2)

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_unknown_event_does_not_crash(self, mock_send):
        try:
            notify('COMPLETELY_UNKNOWN_EVENT_XYZ', order=MagicMock())
        except Exception as e:
            self.fail(f"notify() raised for unknown event: {e}")


# ---------------------------------------------------------------------------
# 5. Email Service Tests
# ---------------------------------------------------------------------------

class TestEmailService(TestCase):

    @override_settings()
    @patch.dict('os.environ', {'EMAIL_ENABLED': 'false'})
    def test_disabled_returns_false(self):
        success, info = send_email(
            'test@example.com', 'Test', 'Subject', '<p>body</p>',
            async_send=False,
        )
        self.assertFalse(success)
        self.assertIn('disabled', info.lower())

    @patch('builtins.print')
    @patch.dict('os.environ', {'EMAIL_ENABLED': 'true', 'EMAIL_PROVIDER': 'console'})
    def test_console_provider(self, mock_print):
        success, info = send_email(
            'test@example.com', 'Test', 'Console Test', '<p>body</p>',
            async_send=False,
        )
        self.assertTrue(success)
        self.assertEqual(info, 'console')

    def test_invalid_email_returns_false(self):
        success, info = send_email(
            'not-an-email', 'Test', 'Subject', '<p>body</p>',
            async_send=False,
        )
        self.assertFalse(success)

    @patch.dict('os.environ', {
        'EMAIL_ENABLED': 'true',
        'EMAIL_PROVIDER': 'brevo',
        'BREVO_SMTP_USERNAME': '',
        'BREVO_SMTP_PASSWORD': '',
    })
    def test_missing_credentials_returns_false(self):
        success, info = send_email(
            'test@example.com', 'Test', 'Subject', '<p>body</p>',
            async_send=False,
        )
        self.assertFalse(success)
        self.assertIn('credentials', info.lower())

    @patch('notifications.email_service.smtplib.SMTP')
    @patch.dict('os.environ', {
        'EMAIL_ENABLED': 'true',
        'EMAIL_PROVIDER': 'brevo',
        'BREVO_SMTP_HOST': 'smtp-relay.brevo.com',
        'BREVO_SMTP_PORT': '587',
        'BREVO_SMTP_USERNAME': 'test@brevo.com',
        'BREVO_SMTP_PASSWORD': 'test_smtp_key_not_real',
        'BREVO_FROM_EMAIL': 'noreply@kisanconnect.in',
        'BREVO_FROM_NAME': 'KisanConnect Test',
    })
    def test_smtp_send_success(self, MockSMTP):
        mock_server = MagicMock()
        MockSMTP.return_value.__enter__ = MagicMock(return_value=mock_server)
        MockSMTP.return_value.__exit__ = MagicMock(return_value=False)

        success, info = send_email(
            'user@example.com', 'Test User', 'Hello', '<p>Hi!</p>',
            async_send=False,
        )
        self.assertTrue(success)
        self.assertEqual(info, 'user@example.com')


# ---------------------------------------------------------------------------
# Bulk Buyer helpers
# ---------------------------------------------------------------------------

def _mock_bulk_requirement(buyer, req_id=10):
    req = MagicMock()
    req.id = req_id
    req.buyer = buyer
    req.crop_name = 'Tomato'
    req.unit = 'kg'
    req.quantity = Decimal('500')
    req.grade = 'A'
    req.target_price_min = Decimal('30')
    req.target_price_max = Decimal('40')
    req.location = 'Mumbai Market, Maharashtra'
    req.status = 'pending'
    return req


def _mock_farmer_offer_full(farmer, buyer, req_id=10, offer_id=20):
    """Full FarmerOffer mock with a real requirement.buyer for Bulk Buyer tests."""
    req = _mock_bulk_requirement(buyer, req_id=req_id)
    offer = MagicMock()
    offer.id = offer_id
    offer.farmer = farmer
    offer.requirement = req
    offer.quantity = Decimal('200')
    offer.price_per_unit = Decimal('35')
    offer.delivery_date = MagicMock()
    offer.delivery_date.__str__ = lambda _: '2026-10-15'
    offer.notes = 'Premium grade, freshly harvested.'
    offer.status = 'pending'
    return offer


def _mock_quote_request(buyer, farmer, quote_id=30):
    product = MagicMock()
    product.id = 5
    product.name = 'Mango'
    product.unit = 'kg'
    product.farmer = farmer

    quote = MagicMock()
    quote.id = quote_id
    quote.buyer = buyer
    quote.product = product
    quote.quantity = Decimal('100')
    quote.target_price = Decimal('80')
    quote.offered_price = Decimal('75')
    quote.status = 'offered'
    return quote


def _mock_wholesale_order(buyer, order_id=50, status='placed'):
    order = MagicMock()
    order.id = order_id
    order.buyer = buyer
    order.status = status
    order.payment_status = 'pending'
    order.total_amount = Decimal('7000')
    order.shipping_charge = Decimal('0')
    order.cancellation_reason = ''
    order.items.all.return_value = []
    return order


# ---------------------------------------------------------------------------
# 6. Bulk Buyer Email Template Rendering Tests
# ---------------------------------------------------------------------------

class TestBulkBuyerEmailTemplates(TestCase):

    def setUp(self):
        self.bulk_buyer = make_user('bulk1', role='bulk_buyer', email='bulk1@test.kisanconnect.in')
        self.farmer = make_user('farmer3', role='farmer', email='farmer3@test.kisanconnect.in')
        self.requirement = _mock_bulk_requirement(self.bulk_buyer)
        self.offer = _mock_farmer_offer_full(self.farmer, self.bulk_buyer)
        self.quote = _mock_quote_request(self.bulk_buyer, self.farmer)
        self.order = _mock_wholesale_order(self.bulk_buyer)

    def _assert_template(self, result):
        self.assertIn('subject', result)
        self.assertIn('html', result)
        self.assertIn('text', result)
        self.assertTrue(result['subject'])
        self.assertIn('KisanConnect', result['html'])
        self.assertIn('<!DOCTYPE html>', result['html'])

    def test_wholesale_farmer_offer_email(self):
        result = tmpl.wholesale_farmer_offer_email(
            bulk_buyer=self.bulk_buyer,
            offer=self.offer,
            requirement=self.requirement,
        )
        self._assert_template(result)
        self.assertIn('Tomato', result['html'])
        self.assertIn('Offer', result['subject'])

    def test_wholesale_bid_accepted_buyer_email(self):
        result = tmpl.wholesale_bid_accepted_buyer_email(
            bulk_buyer=self.bulk_buyer,
            offer=self.offer,
            order=self.order,
        )
        self._assert_template(result)
        self.assertIn('Accepted', result['subject'])
        self.assertIn('Order', result['html'])

    def test_wholesale_bid_rejected_farmer_email(self):
        result = tmpl.wholesale_bid_rejected_farmer_email(
            farmer=self.farmer,
            offer=self.offer,
        )
        self._assert_template(result)
        self.assertIn('Rejected', result['subject'])

    def test_bulk_order_status_email_all_statuses(self):
        for st in ['confirmed', 'packed', 'in_transit', 'delivered']:
            result = tmpl.bulk_order_status_email(
                bulk_buyer=self.bulk_buyer,
                order=self.order,
                new_status=st,
            )
            self._assert_template(result)
            self.assertIn('Wholesale Order', result['subject'])

    def test_bulk_order_cancelled_email(self):
        result = tmpl.bulk_order_cancelled_email(
            bulk_buyer=self.bulk_buyer,
            order=self.order,
        )
        self._assert_template(result)
        self.assertIn('Cancelled', result['subject'])

    def test_quote_offer_made_email(self):
        result = tmpl.quote_offer_made_email(
            bulk_buyer=self.bulk_buyer,
            quote=self.quote,
        )
        self._assert_template(result)
        self.assertIn('Counter-Offer', result['subject'])

    def test_quote_bid_accepted_buyer_email(self):
        result = tmpl.quote_bid_accepted_buyer_email(
            bulk_buyer=self.bulk_buyer,
            quote=self.quote,
            order=self.order,
        )
        self._assert_template(result)
        self.assertIn('Accepted', result['subject'])

    def test_quote_bid_rejected_email_buyer_receives(self):
        """Farmer rejected buyer's request — buyer gets the email."""
        result = tmpl.quote_bid_rejected_email(
            recipient=self.bulk_buyer,
            quote=self.quote,
            rejected_by='farmer',
        )
        self._assert_template(result)
        self.assertIn('Declined', result['subject'])

    def test_quote_bid_rejected_email_farmer_receives(self):
        """Buyer rejected farmer's counter-offer — farmer gets the email."""
        result = tmpl.quote_bid_rejected_email(
            recipient=self.farmer,
            quote=self.quote,
            rejected_by='buyer',
        )
        self._assert_template(result)
        self.assertIn('Rejected', result['subject'])


# ---------------------------------------------------------------------------
# 7. Bulk Buyer Event Dispatch Tests
# ---------------------------------------------------------------------------

@override_settings(EMAIL_ENABLED='true')
class TestBulkBuyerEventDispatch(TestCase):
    """
    Tests that Bulk Buyer events dispatch to the correct recipients.
    SMTP is fully mocked — no real emails are sent.
    """

    def setUp(self):
        self.bulk_buyer = make_user('bulk2', role='bulk_buyer', email='bulk2@test.kisanconnect.in')
        self.farmer = make_user('farmer4', role='farmer', email='farmer4@test.kisanconnect.in')
        self.offer = _mock_farmer_offer_full(self.farmer, self.bulk_buyer)
        self.quote = _mock_quote_request(self.bulk_buyer, self.farmer)
        self.order = _mock_wholesale_order(self.bulk_buyer, order_id=200)

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_wholesale_farmer_offer_made_sends_to_bulk_buyer(self, mock_send):
        """WHOLESALE_FARMER_OFFER_MADE → Bulk Buyer receives email."""
        notify(ev.WHOLESALE_FARMER_OFFER_MADE, offer=self.offer)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.WHOLESALE_FARMER_OFFER_MADE,
                recipient_email=self.bulk_buyer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_wholesale_bid_accepted_buyer_sends_to_bulk_buyer(self, mock_send):
        """WHOLESALE_BID_ACCEPTED_BUYER → Bulk Buyer receives confirmation."""
        notify(ev.WHOLESALE_BID_ACCEPTED_BUYER, offer=self.offer, order=self.order)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.WHOLESALE_BID_ACCEPTED_BUYER,
                recipient_email=self.bulk_buyer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_wholesale_bid_rejected_buyer_sends_to_farmer(self, mock_send):
        """WHOLESALE_BID_REJECTED_BUYER → Farmer (not buyer) receives notification."""
        notify(ev.WHOLESALE_BID_REJECTED_BUYER, offer=self.offer)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.WHOLESALE_BID_REJECTED_BUYER,
                recipient_email=self.farmer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_bulk_order_cancelled_sends_to_bulk_buyer(self, mock_send):
        """BULK_ORDER_CANCELLED → Bulk Buyer receives cancellation email."""
        notify(ev.BULK_ORDER_CANCELLED, order=self.order)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.BULK_ORDER_CANCELLED,
                recipient_email=self.bulk_buyer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_bulk_order_status_changed_sends_for_meaningful_statuses(self, mock_send):
        """BULK_ORDER_STATUS_CHANGED → Bulk Buyer notified for confirmed/packed/in_transit/delivered."""
        for st in ['confirmed', 'packed', 'in_transit', 'delivered']:
            # Use a fresh order-like id per status to avoid duplicate protection
            order = _mock_wholesale_order(self.bulk_buyer, order_id=300 + ['confirmed', 'packed', 'in_transit', 'delivered'].index(st))
            notify(ev.BULK_ORDER_STATUS_CHANGED, order=order, new_status=st)
        self.assertEqual(
            EmailNotificationLog.objects.filter(
                event_type=ev.BULK_ORDER_STATUS_CHANGED,
                recipient_email=self.bulk_buyer.email,
                status='sent',
            ).count(),
            4,
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_bulk_order_status_placed_not_sent(self, mock_send):
        """'placed' status should NOT trigger a BULK_ORDER_STATUS_CHANGED email."""
        notify(ev.BULK_ORDER_STATUS_CHANGED, order=self.order, new_status='placed')
        self.assertFalse(
            EmailNotificationLog.objects.filter(
                event_type=ev.BULK_ORDER_STATUS_CHANGED,
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_quote_offer_made_sends_to_bulk_buyer(self, mock_send):
        """QUOTE_OFFER_MADE → Bulk Buyer receives counter-offer notification."""
        notify(ev.QUOTE_OFFER_MADE, quote=self.quote)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.QUOTE_OFFER_MADE,
                recipient_email=self.bulk_buyer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_quote_offer_made_is_resendable(self, mock_send):
        """QUOTE_OFFER_MADE uses allow_duplicate=True since farmer can update their offer."""
        notify(ev.QUOTE_OFFER_MADE, quote=self.quote)
        notify(ev.QUOTE_OFFER_MADE, quote=self.quote)
        sent_count = EmailNotificationLog.objects.filter(
            event_type=ev.QUOTE_OFFER_MADE,
            status='sent',
        ).count()
        self.assertEqual(sent_count, 2)

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_quote_bid_accepted_buyer_sends_to_bulk_buyer(self, mock_send):
        """QUOTE_BID_ACCEPTED_BUYER → Bulk Buyer receives acceptance confirmation."""
        notify(ev.QUOTE_BID_ACCEPTED_BUYER, quote=self.quote, order=self.order)
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.QUOTE_BID_ACCEPTED_BUYER,
                recipient_email=self.bulk_buyer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_quote_bid_rejected_by_farmer_notifies_buyer(self, mock_send):
        """QUOTE_BID_REJECTED (rejected_by='buyer') → Bulk Buyer notified that farmer rejected."""
        notify(ev.QUOTE_BID_REJECTED, quote=self.quote, rejected_by='buyer')
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.QUOTE_BID_REJECTED,
                recipient_email=self.bulk_buyer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_quote_bid_rejected_by_buyer_notifies_farmer(self, mock_send):
        """QUOTE_BID_REJECTED (rejected_by='farmer') → Farmer notified that buyer rejected counter-offer."""
        notify(ev.QUOTE_BID_REJECTED, quote=self.quote, rejected_by='farmer')
        self.assertTrue(
            EmailNotificationLog.objects.filter(
                event_type=ev.QUOTE_BID_REJECTED,
                recipient_email=self.farmer.email,
                status='sent',
            ).exists()
        )

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_bulk_buyer_no_email_skips_gracefully(self, mock_send):
        """Missing email on Bulk Buyer should never raise — silently skipped."""
        no_email_buyer = make_user('noemail_bulk', role='bulk_buyer', email='')
        no_email_buyer.email = ''
        req = _mock_bulk_requirement(no_email_buyer)
        offer = _mock_farmer_offer_full(self.farmer, no_email_buyer, offer_id=999)
        try:
            notify(ev.WHOLESALE_FARMER_OFFER_MADE, offer=offer)
            notify(ev.WHOLESALE_BID_ACCEPTED_BUYER, offer=offer, order=self.order)
            notify(ev.BULK_ORDER_CANCELLED, order=_mock_wholesale_order(no_email_buyer))
        except Exception as e:
            self.fail(f"notify() raised for Bulk Buyer missing email: {e}")

    @patch('notifications.email_service._do_send', return_value=(True, 'mocked'))
    def test_bulk_order_cancelled_duplicate_protection(self, mock_send):
        """BULK_ORDER_CANCELLED is sent ONCE per order (duplicate protected)."""
        notify(ev.BULK_ORDER_CANCELLED, order=self.order)
        notify(ev.BULK_ORDER_CANCELLED, order=self.order)  # second call — should be skipped
        sent = EmailNotificationLog.objects.filter(
            event_type=ev.BULK_ORDER_CANCELLED, status='sent'
        ).count()
        skipped = EmailNotificationLog.objects.filter(
            event_type=ev.BULK_ORDER_CANCELLED, status='skipped'
        ).count()
        self.assertEqual(sent, 1)
        self.assertEqual(skipped, 1)

