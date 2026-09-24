"""
Quick synchronous Brevo API test — run with:
    python test_brevo_sync.py your@gmail.com
"""
import os, sys, json, urllib.request, urllib.error

# Load .env manually
env_path = os.path.join(os.path.dirname(__file__), '.env')
for line in open(env_path):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('=')
        os.environ.setdefault(k.strip(), v.strip())

API_KEY      = os.environ.get('BREVO_API_KEY', '')
SENDER_EMAIL = os.environ.get('BREVO_SENDER_EMAIL', '')
SENDER_NAME  = os.environ.get('BREVO_SENDER_NAME', 'KisanConnect')
TO_EMAIL     = sys.argv[1] if len(sys.argv) > 1 else SENDER_EMAIL

print(f"API Key    : {API_KEY[:12]}...{API_KEY[-6:]}")
print(f"From       : {SENDER_EMAIL}")
print(f"To         : {TO_EMAIL}")

payload = {
    "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
    "to": [{"email": TO_EMAIL, "name": "Test User"}],
    "subject": "KisanConnect - Brevo Test Email",
    "htmlContent": "<h2>Test Email</h2><p>If you see this, Brevo delivery is working!</p>",
    "textContent": "Test Email - Brevo delivery is working!"
}

req = urllib.request.Request(
    url="https://api.brevo.com/v3/smtp/email",
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "api-key": API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
)

try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = json.loads(resp.read().decode())
        print(f"\nSUCCESS - messageId: {body.get('messageId')}")
except urllib.error.HTTPError as e:
    err = e.read().decode()
    print(f"\nHTTP {e.code} ERROR:\n{err}")
except Exception as e:
    print(f"\nEXCEPTION: {e}")
