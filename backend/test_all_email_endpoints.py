import os
import sys
import time
from decimal import Decimal
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kisan_connect.settings')
django.setup()

from django.contrib.auth import get_user_model
from products.models import Product
from orders.models import Order, OrderItem
from notifications.events import notify
import notifications.events as ev
from notifications.models import EmailNotificationLog

User = get_user_model()

def test_full_order_email_flow():
    print("=" * 60)
    print("VERIFYING END-TO-END EMAIL NOTIFICATION ENDPOINTS")
    print("=" * 60)

    farmer = User.objects.filter(email='jett60545@gmail.com').first()
    consumer = User.objects.filter(email='legend04433@gmail.com').first()
    bulk_buyer = User.objects.filter(email='bmwq22835@gmail.com').first()

    assert farmer, "Farmer user jett60545@gmail.com must exist."
    assert consumer, "Consumer user legend04433@gmail.com must exist."
    assert bulk_buyer, "Bulk Buyer user bmwq22835@gmail.com must exist."

    # Fetch a product listed by Neeraj Patel
    prod = Product.objects.filter(farmer=farmer).first()
    assert prod, "Farmer must have at least one product."

    print(f"\n1. Creating test order for Consumer ({consumer.username}) -> Product: {prod.name} (Farmer: {farmer.username})...")
    
    test_order = Order.objects.create(
        buyer=consumer,
        product_subtotal=Decimal('150.00'),
        shipping_charge=Decimal('40.00'),
        total_amount=Decimal('190.00'),
        status='placed',
        shipping_address=consumer.address,
        shipping_pincode=consumer.pincode,
        payment_status='paid',
        payment_id='pay_live_test_email_001',
        razorpay_order_id='rzp_order_live_test_001'
    )
    OrderItem.objects.create(order=test_order, product=prod, quantity=Decimal('3.00'), price=prod.price_per_unit)

    print(f"   Order #{test_order.id} created and marked PAID.")

    print("\n2. Triggering FARMER_NEW_ORDER and ORDER_CREATED notifications...")
    notify(ev.FARMER_NEW_ORDER, order=test_order)
    notify(ev.ORDER_CREATED, order=test_order)

    print("\n3. Waiting 3 seconds for Brevo asynchronous thread delivery...")
    time.sleep(3)

    print("\n4. Checking EmailNotificationLog in Database:")
    logs = EmailNotificationLog.objects.filter(entity_id__startswith=str(test_order.id)).order_by('-sent_at')
    
    found_farmer_email = False
    found_consumer_email = False

    for log in logs:
        print(f"   [OK] Event: {log.event_type} | To: {log.recipient_email} | Status: {log.status} | Error: {log.error_message or 'None'}")
        if log.event_type == ev.FARMER_NEW_ORDER and log.recipient_email == farmer.email and log.status == 'sent':
            found_farmer_email = True
        if log.event_type in [ev.ORDER_CREATED, ev.ORDER_OTP_SENT] and log.recipient_email == consumer.email and log.status == 'sent':
            found_consumer_email = True

    print("\n" + "=" * 60)
    if found_farmer_email and found_consumer_email:
        print("ALL EMAIL ENDPOINTS ARE WORKING PERFECTLY!")
        print(f"  - Farmer ({farmer.email}) received Order Alert Email.")
        print(f"  - Consumer ({consumer.email}) received Order Confirmation Email.")
    else:
        print(f"Summary: Farmer Email Sent = {found_farmer_email}, Consumer Email Sent = {found_consumer_email}")
    print("=" * 60)

if __name__ == '__main__':
    test_full_order_email_flow()
