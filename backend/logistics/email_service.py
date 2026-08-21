import urllib.request
import urllib.error
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def send_delivery_otp_email(shipment):
    """
    Sends the 6-digit delivery OTP to the consumer's registered email address
    via Brevo (Sendinblue) Transactional Email API.

    Includes full order details, driver name & contact info, and clear instructions.
    """
    try:
        order = shipment.order
        buyer = order.buyer

        recipient_email = buyer.email
        if not recipient_email:
            print(f"[EMAIL] Buyer '{buyer.username}' for order #{order.id} has no email address configured.")
            return False, "Buyer has no email address configured in their account."

        driver_name = shipment.partner.name if shipment.partner else "Assigned Delivery Partner"
        driver_phone = shipment.partner.phone if (shipment.partner and shipment.partner.phone) else "+91 90000 00000"
        otp = shipment.delivery_otp

        subject = f"🌱 KisanConnect: Delivery OTP for Order #{order.id} is {otp}"

        # Build item list HTML & text
        items_html_list = []
        items_text_list = []
        for item in order.items.all():
            prod_name = item.product.name if item.product else "Produce Item"
            unit = item.product.unit if item.product else "kg"
            qty = float(item.quantity)
            price = float(item.price)
            sub = qty * price
            items_html_list.append(
                f"<div style='display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:13px;'>"
                f"<span>• <strong>{prod_name}</strong> × {qty} {unit}</span>"
                f"<span style='color:#0f172a;font-weight:600;'>₹{sub:.2f}</span>"
                f"</div>"
            )
            items_text_list.append(f"• {prod_name} ({qty} {unit}) - ₹{sub:.2f}")

        items_html = "".join(items_html_list)
        items_text = "\n".join(items_text_list)

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Delivery OTP - KisanConnect</title>
        </head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;margin:0;padding:24px 12px;color:#1e293b;">
            <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">
                
                <!-- Brand Header -->
                <div style="background:linear-gradient(135deg, #059669 0%, #10b981 100%);padding:32px 24px;text-align:center;color:#ffffff;">
                    <div style="font-size:36px;margin-bottom:8px;">🌱</div>
                    <h1 style="margin:0;font-size:24px;font-weight:900;letter-spacing:-0.5px;">KisanConnect</h1>
                    <p style="margin:6px 0 0 0;font-size:14px;color:#d1fae5;font-weight:500;">Direct Farmer-to-Consumer Produce Delivery</p>
                </div>

                <!-- Main Body -->
                <div style="padding:28px 24px;">
                    <p style="font-size:15px;margin:0 0 16px 0;line-height:1.5;">
                        Hello <strong>{buyer.username}</strong>,
                    </p>
                    <p style="font-size:14px;color:#475569;margin:0 0 20px 0;line-height:1.6;">
                        Your fresh farm produce order <strong>#{order.id}</strong> is out for delivery! When your driver arrives, share the verification OTP below after inspecting your package.
                    </p>

                    <!-- OTP Highlight Box -->
                    <div style="background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);border:2px dashed #059669;border-radius:18px;padding:24px 16px;text-align:center;margin:24px 0;">
                        <div style="font-size:11px;font-weight:800;color:#047857;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">
                            Your Delivery Verification OTP
                        </div>
                        <div style="font-size:42px;font-weight:900;color:#065f46;letter-spacing:10px;margin:10px 0;font-family:Consolas, Monaco, monospace;">
                            {otp}
                        </div>
                        <div style="font-size:11px;color:#047857;font-weight:600;margin-top:8px;">
                            🔒 Share this code with the driver only upon receiving your items
                        </div>
                    </div>

                    <!-- Driver Details Box -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:20px;">
                        <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
                            🚚 Delivery Partner Info
                        </div>
                        <table style="width:100%;font-size:13px;border-collapse:collapse;">
                            <tr>
                                <td style="padding:4px 0;color:#64748b;width:40%;">Driver Name:</td>
                                <td style="padding:4px 0;font-weight:700;color:#0f172a;">{driver_name}</td>
                            </tr>
                            <tr>
                                <td style="padding:4px 0;color:#64748b;">Contact:</td>
                                <td style="padding:4px 0;font-weight:700;color:#0f172a;">{driver_phone}</td>
                            </tr>
                            <tr>
                                <td style="padding:4px 0;color:#64748b;">Drop Address:</td>
                                <td style="padding:4px 0;color:#334155;">{shipment.delivery_address}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Order Bill Summary -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:12px;">
                        <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
                            📦 Order #{order.id} Summary
                        </div>
                        {items_html}
                        <div style="display:flex;justify-content:space-between;padding:8px 0 4px 0;font-size:12px;color:#64748b;">
                            <span>Transportation / Delivery:</span>
                            <span>+ ₹{float(order.shipping_charge):.2f}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:6px;border-top:1px dashed #cbd5e1;font-weight:800;font-size:15px;color:#059669;">
                            <span>Total Amount:</span>
                            <span>₹{float(order.total_amount):.2f} ({order.payment_status.upper()})</span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background:#f1f5f9;padding:18px 24px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
                    <p style="margin:0 0 4px 0;">Supporting sustainable farming and fair farmer compensation.</p>
                    <p style="margin:0;color:#94a3b8;">© 2026 KisanConnect Platform · All Rights Reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Brevo API Request Payload
        payload = {
            "sender": {
                "name": getattr(settings, 'BREVO_SENDER_NAME', 'KisanConnect Platform'),
                "email": getattr(settings, 'BREVO_SENDER_EMAIL', 'yugsayja312@gmail.com')
            },
            "to": [
                {
                    "email": recipient_email,
                    "name": buyer.username or "Valued Consumer"
                }
            ],
            "subject": subject,
            "htmlContent": html_content
        }

        api_key = getattr(settings, 'BREVO_API_KEY', '')
        if not api_key:
            print("[EMAIL WARNING] No BREVO_API_KEY configured in settings.")
            return False, "BREVO_API_KEY is not configured."

        req = urllib.request.Request(
            url="https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode('utf-8'),
            headers={
                "api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            msg_id = res_data.get('messageId', 'ok')
            print(f"[BREVO EMAIL] Successfully sent delivery OTP {otp} for order #{order.id} to {recipient_email} (Msg ID: {msg_id})")
            return True, recipient_email

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"[BREVO EMAIL HTTP ERROR] {e.code}: {error_body}")
        logger.error(f"Brevo HTTP error: {e.code} - {error_body}")
        return False, f"Brevo API error: {e.code}"
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to dispatch OTP email: {str(e)}")
        logger.error(f"Failed to send OTP email: {str(e)}", exc_info=True)
        return False, str(e)
