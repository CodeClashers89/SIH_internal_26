import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kisan_connect.settings')
django.setup()

from django.contrib.auth import get_user_model
from notifications.email_service import send_email

User = get_user_model()

def get_or_create_user(email, username, role, password):
    user, created = User.objects.get_or_create(username=username, defaults={
        'email': email,
        'role': role
    })
    
    # Always update email, role, and password in case user already existed
    user.email = email
    user.role = role
    user.set_password(password)
    user.save()
    
    status = "Created" if created else "Updated"
    print(f"{status} {role} user: {username} ({email})")

def run():
    print("Setting up users...")
    
    # 1. Consumer
    get_or_create_user(
        email='legend04433@gmail.com',
        username='peter_consumer',
        role='consumer',
        password='Password123!'
    )
    
    # 2. Farmer
    get_or_create_user(
        email='jett60545@gmail.com',
        username='jett_farmer',
        role='farmer',
        password='Password123!'
    )
    
    # 3. Logistics Partner
    get_or_create_user(
        email='tljack482@gmail.com',
        username='tljack_logistics',
        role='logistics_partner',
        password='Password123!'
    )
    
    # 4. Bulk Buyer
    get_or_create_user(
        email='bmwq22835@gmail.com',
        username='bmwq_bulkbuyer',
        role='bulk_buyer',
        password='Password123!'
    )
    
    print("\nTesting email connection...")
    success, info = send_email(
        to_email='neel9086@gmail.com',
        to_name='Neel',
        subject='Brevo SMTP Test - KisanConnect',
        html_body='<h3>Connection Successful</h3><p>If you are seeing this, Brevo SMTP is successfully configured and sending emails.</p>',
        text_body='Connection Successful. Brevo SMTP is configured.',
        async_send=False  # Send synchronously so we see errors immediately
    )
    
    if success:
        print(f"[SUCCESS] Email test successful! Sent to: {info}")
    else:
        print(f"[FAILED] Email test failed! Error info: {info}")

if __name__ == '__main__':
    run()
