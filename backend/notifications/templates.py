"""
notifications/templates.py
============================
Professional HTML email templates for every KisanConnect notification event.

All templates return a dict: {'subject': str, 'html': str, 'text': str}

Design: Green-on-white brand palette, mobile-responsive inline CSS,
KisanConnect branding, dynamic data injection.
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Brand constants
# ---------------------------------------------------------------------------
BRAND_GREEN = '#059669'
BRAND_GREEN_DARK = '#047857'
BRAND_GREEN_LIGHT = '#d1fae5'
BRAND_BG = '#f8fafc'
BRAND_TEXT = '#1e293b'
BRAND_MUTED = '#64748b'
BRAND_BORDER = '#e2e8f0'

SUPPORT_EMAIL = 'support@kisanconnect.in'
BRAND_NAME = 'KisanConnect'
BRAND_TAGLINE = 'Direct Farmer-to-Consumer Produce Delivery'


# ---------------------------------------------------------------------------
# Base layout
# ---------------------------------------------------------------------------

def _base(title: str, content_html: str, cta_url: str = '', cta_label: str = '') -> str:
    """Wrap content in the branded email shell."""
    cta_block = ''
    if cta_url and cta_label:
        cta_block = f"""
        <div style="text-align:center;margin:24px 0;">
          <a href="{cta_url}"
             style="display:inline-block;background:linear-gradient(135deg,{BRAND_GREEN},#10b981);
                    color:#fff;font-weight:700;font-size:15px;padding:14px 32px;
                    border-radius:50px;text-decoration:none;letter-spacing:0.3px;">
            {cta_label}
          </a>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
             background:{BRAND_BG};margin:0;padding:24px 12px;color:{BRAND_TEXT};">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;
              overflow:hidden;border:1px solid {BRAND_BORDER};
              box-shadow:0 10px 25px -5px rgba(0,0,0,0.07);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,{BRAND_GREEN} 0%,#10b981 100%);
                padding:32px 24px;text-align:center;color:#fff;">
      <div style="font-size:38px;margin-bottom:6px;">🌱</div>
      <h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;">{BRAND_NAME}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:{BRAND_GREEN_LIGHT};font-weight:500;">{BRAND_TAGLINE}</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 24px;">
      {content_html}
      {cta_block}
    </div>

    <!-- Footer -->
    <div style="background:#f1f5f9;padding:18px 24px;text-align:center;
                font-size:11px;color:{BRAND_MUTED};border-top:1px solid {BRAND_BORDER};">
      <p style="margin:0 0 4px;">Supporting sustainable farming and fair farmer compensation.</p>
      <p style="margin:0;">© 2026 {BRAND_NAME} · <a href="mailto:{SUPPORT_EMAIL}"
         style="color:{BRAND_GREEN};text-decoration:none;">{SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>"""


def _info_row(label: str, value: str) -> str:
    return (
        f"<tr>"
        f"<td style='padding:5px 0;color:{BRAND_MUTED};width:42%;font-size:13px;vertical-align:top;'>{label}</td>"
        f"<td style='padding:5px 0;font-weight:700;color:{BRAND_TEXT};font-size:13px;'>{value}</td>"
        f"</tr>"
    )


def _info_card(rows_html: str, icon: str = '📋', heading: str = 'Details') -> str:
    return f"""
    <div style="background:{BRAND_BG};border:1px solid {BRAND_BORDER};border-radius:16px;
                padding:16px;margin:16px 0;">
      <div style="font-size:11px;font-weight:800;color:{BRAND_MUTED};text-transform:uppercase;
                  letter-spacing:0.8px;margin-bottom:10px;">{icon} {heading}</div>
      <table style="width:100%;border-collapse:collapse;">{rows_html}</table>
    </div>"""


def _status_badge(label: str, color: str = BRAND_GREEN) -> str:
    return (
        f"<span style='display:inline-block;background:{color};color:#fff;"
        f"font-size:11px;font-weight:700;padding:3px 10px;border-radius:50px;"
        f"letter-spacing:0.5px;text-transform:uppercase;'>{label}</span>"
    )


def _greeting(name: str) -> str:
    return f"<p style='font-size:15px;margin:0 0 14px;'>Hello <strong>{name}</strong>,</p>"


# ---------------------------------------------------------------------------
# 1. Order Confirmation + Delivery OTP
# ---------------------------------------------------------------------------

def order_otp_email(*, order, otp: str, shipment=None) -> dict:
    """Sent to consumer when driver accepts the job or when order is picked up."""
    buyer = order.buyer
    driver_name = 'Assigned Delivery Partner'
    driver_phone = 'Provided at delivery'
    delivery_address = order.shipping_address

    if shipment and shipment.partner:
        driver_name = shipment.partner.name or driver_name
        driver_phone = shipment.partner.phone or driver_phone
    if shipment and shipment.delivery_address:
        delivery_address = shipment.delivery_address

    items_rows = ''
    for item in order.items.all():
        name = item.product.name if item.product else 'Produce Item'
        unit = item.product.unit if item.product else 'kg'
        qty = float(item.quantity)
        price = float(item.price)
        items_rows += f"<tr><td style='padding:4px 0;font-size:13px;'>• <strong>{name}</strong> × {qty} {unit}</td><td style='padding:4px 0;font-size:13px;font-weight:600;'>₹{qty*price:.2f}</td></tr>"

    content = f"""
    {_greeting(buyer.first_name or buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      Your fresh farm produce order <strong>#{order.id}</strong> is on its way!
      When your driver arrives, share the OTP below <em>after inspecting your package</em>.
    </p>

    <!-- OTP Box -->
    <div style="background:linear-gradient(135deg,#ecfdf5,{BRAND_GREEN_LIGHT});
                border:2px dashed {BRAND_GREEN};border-radius:18px;padding:24px 16px;
                text-align:center;margin:20px 0;">
      <div style="font-size:11px;font-weight:800;color:{BRAND_GREEN_DARK};
                  text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">
        Delivery Verification OTP
      </div>
      <div style="font-size:44px;font-weight:900;color:#065f46;letter-spacing:10px;
                  margin:10px 0;font-family:Consolas,Monaco,monospace;">{otp}</div>
      <div style="font-size:12px;color:{BRAND_GREEN_DARK};font-weight:600;margin-top:8px;">
        🔒 Share ONLY with your authorized delivery partner after receiving items
      </div>
    </div>

    <!-- Security warning -->
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;
                padding:12px 16px;margin:14px 0;font-size:12px;color:#78350f;">
      ⚠️ <strong>Security Notice:</strong> KisanConnect will NEVER ask for this OTP via phone or WhatsApp.
      Only share this code with the driver when they physically hand over your package.
    </div>

    {_info_card(
        _info_row('Driver', driver_name) +
        _info_row('Contact', driver_phone) +
        _info_row('Delivery Address', delivery_address),
        '🚚', 'Delivery Partner'
    )}

    {_info_card(
        items_rows +
        f"<tr><td style='padding-top:8px;font-size:12px;color:{BRAND_MUTED};'>Delivery Charge</td><td style='padding-top:8px;font-size:12px;'>+ ₹{float(order.shipping_charge):.2f}</td></tr>" +
        f"<tr><td style='padding-top:10px;border-top:1px dashed {BRAND_BORDER};font-weight:800;color:{BRAND_GREEN};font-size:15px;'>Total</td><td style='padding-top:10px;border-top:1px dashed {BRAND_BORDER};font-weight:800;color:{BRAND_GREEN};font-size:15px;'>₹{float(order.total_amount):.2f}</td></tr>",
        '📦', f'Order #{order.id} Summary'
    )}
    """

    subject = f"🌱 Your Order #{order.id} — Delivery OTP: {otp}"
    return {
        'subject': subject,
        'html': _base(f"Delivery OTP — Order #{order.id}", content),
        'text': f"Delivery OTP for Order #{order.id}: {otp}\nShare ONLY with your authorized delivery partner.",
    }


# ---------------------------------------------------------------------------
# 2. Order Cancellation
# ---------------------------------------------------------------------------

def order_cancelled_email(*, order) -> dict:
    buyer = order.buyer
    reason = order.cancellation_reason or 'No specific reason provided.'

    items_rows = ''
    for item in order.items.all():
        name = item.product.name if item.product else 'Item'
        unit = item.product.unit if item.product else 'kg'
        items_rows += _info_row(f"{name} × {float(item.quantity)} {unit}", f"₹{float(item.quantity * item.price):.2f}")

    content = f"""
    {_greeting(buyer.first_name or buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      We're sorry — your order <strong>#{order.id}</strong> has been cancelled.
    </p>
    {_info_card(
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Status', 'Cancelled') +
        _info_row('Reason', reason) +
        _info_row('Original Amount', f'₹{float(order.total_amount):.2f}') +
        _info_row('Payment Status', order.payment_status.upper()),
        '❌', 'Cancellation Details'
    )}
    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      {'If you were charged, a refund will be processed to your original payment method within 3-7 business days.' if order.payment_status == 'paid' else 'No charge was made for this order.'}
      If you have questions, please contact us at <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN};">{SUPPORT_EMAIL}</a>.
    </p>
    """
    subject = f"Your Order #{order.id} Has Been Cancelled — KisanConnect"
    return {
        'subject': subject,
        'html': _base(f"Order #{order.id} Cancelled", content),
        'text': f"Your Order #{order.id} has been cancelled.\nReason: {reason}",
    }


# ---------------------------------------------------------------------------
# 3. Order Status Update (progress emails for consumer)
# ---------------------------------------------------------------------------

STATUS_LABEL_MAP = {
    'placed': ('Order Placed', '🛒', '#6366f1', 'Your order has been placed and is awaiting farmer confirmation.'),
    'confirmed': ('Order Confirmed by Farmer', '✅', BRAND_GREEN, 'The farmer has confirmed your order and will begin preparing it.'),
    'packed': ('Order Packed & Ready', '📦', '#f59e0b', 'Your order is packed and ready for pickup by the delivery partner.'),
    'in_transit': ('Order Picked Up — On Its Way!', '🚚', '#0ea5e9', 'Your order has been picked up and is in transit to you.'),
    'delivered': ('Order Delivered', '🎉', BRAND_GREEN, 'Your order has been delivered. Enjoy your fresh farm produce!'),
}

def order_status_email(*, order, new_status: str) -> dict:
    buyer = order.buyer
    label, icon, color, description = STATUS_LABEL_MAP.get(
        new_status,
        (new_status.replace('_', ' ').title(), '📋', BRAND_GREEN, 'Your order status has been updated.')
    )

    items_rows = ''
    for item in order.items.all():
        name = item.product.name if item.product else 'Item'
        unit = item.product.unit if item.product else 'kg'
        items_rows += _info_row(f"{name} × {float(item.quantity)} {unit}", f"₹{float(item.price):.2f}/unit")

    content = f"""
    {_greeting(buyer.first_name or buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      Your order <strong>#{order.id}</strong> status has been updated.
    </p>

    <!-- Status Banner -->
    <div style="background:linear-gradient(135deg,{color}22,{color}11);border-left:4px solid {color};
                border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">{icon}</div>
      <div style="font-size:17px;font-weight:800;color:{color};">{label}</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">{description}</div>
    </div>

    {_info_card(
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Current Status', label) +
        _info_row('Total Amount', f'₹{float(order.total_amount):.2f}') +
        _info_row('Payment', order.payment_status.upper()),
        '📋', 'Order Details'
    )}
    """
    subject = f"{icon} Your Order #{order.id} — {label}"
    return {
        'subject': subject,
        'html': _base(f"Order #{order.id}: {label}", content),
        'text': f"Your Order #{order.id} status: {label}\n{description}",
    }


# ---------------------------------------------------------------------------
# 4. Custom Request (QuoteRequest) Accepted
# ---------------------------------------------------------------------------

def custom_request_accepted_email(*, quote) -> dict:
    buyer = quote.buyer
    product = quote.product
    farmer = product.farmer if product else None
    farmer_name = (farmer.first_name or farmer.username) if farmer else 'Farmer'

    final_price = quote.offered_price or quote.target_price

    content = f"""
    {_greeting(buyer.first_name or buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      Great news! Your custom product request <strong>#{quote.id}</strong> has been accepted.
      An order has been created and is ready for payment.
    </p>

    <!-- Success Banner -->
    <div style="background:linear-gradient(135deg,#ecfdf5,{BRAND_GREEN_LIGHT});
                border-left:4px solid {BRAND_GREEN};border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">🎉</div>
      <div style="font-size:17px;font-weight:800;color:{BRAND_GREEN};">Request Accepted!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        The farmer has agreed to your requested terms. Please complete payment to confirm.
      </div>
    </div>

    {_info_card(
        _info_row('Request ID', f'#{quote.id}') +
        _info_row('Product', product.name if product else 'N/A') +
        _info_row('Quantity', f'{float(quote.quantity)} {product.unit if product else "kg"}') +
        _info_row('Agreed Price', f'₹{float(final_price):.2f}/unit') +
        _info_row('Total Amount', f'₹{float(quote.quantity * final_price):.2f}') +
        _info_row('Farmer', farmer_name),
        '📄', 'Request Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Next Step:</strong> Log in to KisanConnect to complete payment and confirm your order.
    </p>
    """
    subject = f"✅ Your Custom Request #{quote.id} Has Been Accepted — KisanConnect"
    return {
        'subject': subject,
        'html': _base(f"Custom Request #{quote.id} Accepted", content),
        'text': f"Your custom request #{quote.id} for {product.name if product else 'product'} has been accepted.\nAgreed price: ₹{float(final_price):.2f}/unit",
    }


# ---------------------------------------------------------------------------
# 5. Password Reset
# ---------------------------------------------------------------------------

def password_reset_email(*, user, reset_url: str) -> dict:
    content = f"""
    {_greeting(user.first_name or user.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      We received a request to reset the password for your KisanConnect account
      associated with <strong>{user.email}</strong>.
    </p>

    <!-- Reset Link Box -->
    <div style="background:#fef9f0;border:1px solid #fcd34d;border-radius:16px;
                padding:20px;text-align:center;margin:20px 0;">
      <div style="font-size:24px;margin-bottom:10px;">🔐</div>
      <p style="font-size:14px;color:{BRAND_TEXT};margin:0 0 16px;">
        Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.
      </p>
      <a href="{reset_url}"
         style="display:inline-block;background:linear-gradient(135deg,{BRAND_GREEN},#10b981);
                color:#fff;font-weight:700;font-size:15px;padding:14px 32px;
                border-radius:50px;text-decoration:none;letter-spacing:0.3px;">
        Reset My Password
      </a>
    </div>

    <!-- Security warnings -->
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;
                padding:12px 16px;margin:14px 0;font-size:12px;color:#7f1d1d;">
      🔒 <strong>Security Tips:</strong>
      <ul style="margin:6px 0 0;padding-left:16px;">
        <li>If you did not request this reset, ignore this email — your password remains unchanged.</li>
        <li>Never share this link with anyone.</li>
        <li>KisanConnect will never ask for your password via email or phone.</li>
      </ul>
    </div>

    <p style="font-size:12px;color:{BRAND_MUTED};margin-top:16px;">
      Or copy this link into your browser:<br>
      <span style="color:{BRAND_GREEN};word-break:break-all;">{reset_url}</span>
    </p>
    """
    subject = "Reset Your KisanConnect Password"
    return {
        'subject': subject,
        'html': _base("Reset Your Password", content),
        'text': f"Reset your KisanConnect password using the link below (expires in 15 minutes):\n\n{reset_url}\n\nIf you did not request this, ignore this email.",
    }


# ---------------------------------------------------------------------------
# 6. Product Freshness Alert (0%)
# ---------------------------------------------------------------------------

def freshness_alert_email(*, user, product) -> dict:
    name = product.name
    freshness = product.freshness_percentage

    content = f"""
    {_greeting(user.first_name or user.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      This is an important freshness alert for a product in your recent order.
    </p>

    <!-- Alert Banner -->
    <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">⚠️</div>
      <div style="font-size:17px;font-weight:800;color:#dc2626;">Freshness Alert — 0%</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        <strong>{name}</strong> has reached 0% freshness and should no longer be consumed.
      </div>
    </div>

    {_info_card(
        _info_row('Product', name) +
        _info_row('Product ID', f'#{product.id}') +
        _info_row('Freshness', f'{freshness}%') +
        _info_row('Category', product.category.title()) +
        _info_row('Harvest Date', str(product.harvest_date)) +
        _info_row('Expiry Date', str(product.expiry_date)),
        '🥦', 'Product Information'
    )}

    <p style="font-size:13px;color:#7f1d1d;margin-top:16px;line-height:1.6;
              background:#fef2f2;border-radius:12px;padding:12px 16px;">
      <strong>Recommended Action:</strong> Do not consume this product.
      Dispose of it safely. If you believe this alert is incorrect, please contact us at
      <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN};">{SUPPORT_EMAIL}</a>.
    </p>
    """
    subject = f"⚠️ Freshness Alert — {name} Has Reached 0% — KisanConnect"
    return {
        'subject': subject,
        'html': _base(f"Freshness Alert: {name}", content),
        'text': f"Freshness Alert: {name} has reached 0% freshness (Product #{product.id}).\nPlease dispose of this product safely.",
    }


# ---------------------------------------------------------------------------
# 7. New Order for Farmer
# ---------------------------------------------------------------------------

def farmer_new_order_email(*, farmer, order) -> dict:
    buyer = order.buyer
    buyer_name = buyer.first_name or buyer.username

    items_rows = ''
    for item in order.items.all():
        if item.product and item.product.farmer_id == farmer.id:
            name = item.product.name
            unit = item.product.unit
            items_rows += _info_row(
                f"{name} × {float(item.quantity)} {unit}",
                f"₹{float(item.price):.2f}/unit"
            )

    content = f"""
    {_greeting(farmer.first_name or farmer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      You have received a new customer order for your produce!
      Please review and confirm it from your farmer dashboard.
    </p>

    <!-- New Order Banner -->
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-left:4px solid #3b82f6;
                border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">🛒</div>
      <div style="font-size:17px;font-weight:800;color:#1d4ed8;">New Order Received!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        Order #{order.id} placed by {buyer_name}
      </div>
    </div>

    {_info_card(
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Customer', buyer_name) +
        _info_row('Delivery Address', order.shipping_address) +
        _info_row('Order Amount', f'₹{float(order.total_amount):.2f}') +
        _info_row('Payment Status', order.payment_status.upper()) +
        _info_row('Current Status', order.status.upper()),
        '📦', 'Order Details'
    )}

    {_info_card(items_rows, '🌾', 'Your Products in This Order') if items_rows else ''}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Action Required:</strong> Log in to your KisanConnect Farmer Dashboard to confirm or manage this order.
    </p>
    """
    subject = f"🛒 New Customer Order Received — #{order.id}"
    return {
        'subject': subject,
        'html': _base(f"New Order #{order.id}", content),
        'text': f"New order #{order.id} received from {buyer_name}.\nAmount: ₹{float(order.total_amount):.2f}\nLog in to your farmer dashboard to confirm.",
    }


# ---------------------------------------------------------------------------
# 8. Wholesale Bid Confirmed (for Farmer)
# ---------------------------------------------------------------------------

def wholesale_bid_confirmed_email(*, farmer, offer) -> dict:
    requirement = offer.requirement
    buyer = requirement.buyer
    buyer_name = buyer.first_name or buyer.username

    content = f"""
    {_greeting(farmer.first_name or farmer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      A bulk buyer has confirmed your wholesale offer. An order has been created for payment.
    </p>

    <!-- Confirmation Banner -->
    <div style="background:linear-gradient(135deg,#ecfdf5,{BRAND_GREEN_LIGHT});
                border-left:4px solid {BRAND_GREEN};border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">💰</div>
      <div style="font-size:17px;font-weight:800;color:{BRAND_GREEN};">Wholesale Offer Confirmed!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        Your offer #{offer.id} for {requirement.crop_name} has been accepted.
      </div>
    </div>

    {_info_card(
        _info_row('Offer ID', f'#{offer.id}') +
        _info_row('Requirement ID', f'#{requirement.id}') +
        _info_row('Crop', requirement.crop_name) +
        _info_row('Quantity', f'{float(offer.quantity)} {requirement.unit}') +
        _info_row('Your Price', f'₹{float(offer.price_per_unit):.2f}/{requirement.unit}') +
        _info_row('Total Value', f'₹{float(offer.quantity * offer.price_per_unit):.2f}') +
        _info_row('Delivery Date', str(offer.delivery_date)) +
        _info_row('Buyer', buyer_name),
        '📜', 'Confirmed Offer Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Next Steps:</strong> The buyer will complete payment shortly.
      Prepare your produce for delivery by <strong>{offer.delivery_date}</strong>.
    </p>
    """
    subject = f"💰 Wholesale Bid Confirmed — Offer #{offer.id} ({requirement.crop_name})"
    return {
        'subject': subject,
        'html': _base(f"Wholesale Bid #{offer.id} Confirmed", content),
        'text': f"Your wholesale offer #{offer.id} for {requirement.crop_name} ({float(offer.quantity)} {requirement.unit}) has been confirmed by the buyer.\nTotal value: ₹{float(offer.quantity * offer.price_per_unit):.2f}",
    }


# ---------------------------------------------------------------------------
# 9. Driver / Transport Partner — New Task Assigned
# ---------------------------------------------------------------------------

def driver_task_assigned_email(*, transport_offer) -> dict:
    """Farmer sends a private transport offer to a specific driver."""
    shipment = transport_offer.shipment
    order = shipment.order
    farmer = transport_offer.farmer
    partner = transport_offer.partner
    driver_user = partner.user

    content = f"""
    {_greeting((driver_user.first_name if driver_user else None) or partner.name)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      A farmer has assigned you a delivery task. Please log in to your KisanConnect
      dashboard to accept or reject this offer.
    </p>

    <!-- Task Banner -->
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-left:4px solid #3b82f6;
                border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">🚚</div>
      <div style="font-size:17px;font-weight:800;color:#1d4ed8;">New Delivery Task Assigned</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        Shipment #{shipment.id} · Order #{order.id}
      </div>
    </div>

    {_info_card(
        _info_row('Shipment ID', f'#{shipment.id}') +
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Pickup Location', shipment.pickup_address) +
        _info_row('Delivery Location', shipment.delivery_address) +
        _info_row('Distance', f'{float(shipment.distance_km):.1f} km') +
        _info_row('Assigned By (Farmer)', farmer.first_name or farmer.username) +
        _info_row('Message', transport_offer.message or 'Please deliver this order.'),
        '📋', 'Task Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Action Required:</strong> Log in to your KisanConnect Driver Dashboard
      and respond to this offer. You can <strong>Accept</strong> or <strong>Reject</strong> the task.
    </p>
    """
    subject = f"🚚 New Delivery Task Assigned — Shipment #{shipment.id}"
    return {
        'subject': subject,
        'html': _base(f"Delivery Task #{shipment.id}", content),
        'text': f"New delivery task: Shipment #{shipment.id}, Order #{order.id}\nPickup: {shipment.pickup_address}\nDelivery: {shipment.delivery_address}\nLog in to accept or reject.",
    }


# ---------------------------------------------------------------------------
# 10. Driver Accepted Task — confirmation to driver
# ---------------------------------------------------------------------------

def driver_accepted_confirmation_email(*, transport_offer) -> dict:
    shipment = transport_offer.shipment
    order = shipment.order
    partner = transport_offer.partner
    driver_user = partner.user

    content = f"""
    {_greeting((driver_user.first_name if driver_user else None) or partner.name)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      You have successfully accepted Delivery Task #{shipment.id}.
      Please proceed to the pickup location at your earliest convenience.
    </p>

    <div style="background:linear-gradient(135deg,#ecfdf5,{BRAND_GREEN_LIGHT});
                border-left:4px solid {BRAND_GREEN};border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">✅</div>
      <div style="font-size:17px;font-weight:800;color:{BRAND_GREEN};">Task Accepted!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        You are now assigned to Shipment #{shipment.id}.
      </div>
    </div>

    {_info_card(
        _info_row('Shipment ID', f'#{shipment.id}') +
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Pickup Location', shipment.pickup_address) +
        _info_row('Delivery Location', shipment.delivery_address) +
        _info_row('Distance', f'{float(shipment.distance_km):.1f} km'),
        '🗺️', 'Delivery Details'
    )}
    """
    subject = f"✅ Task Confirmed — Shipment #{shipment.id}"
    return {
        'subject': subject,
        'html': _base(f"Task #{shipment.id} Confirmed", content),
        'text': f"You have accepted Shipment #{shipment.id}, Order #{order.id}.\nPickup: {shipment.pickup_address}\nDeliver to: {shipment.delivery_address}",
    }


# ---------------------------------------------------------------------------
# 11. Driver Accepted — notify farmer
# ---------------------------------------------------------------------------

def farmer_driver_accepted_email(*, transport_offer) -> dict:
    shipment = transport_offer.shipment
    order = shipment.order
    farmer = transport_offer.farmer
    partner = transport_offer.partner
    driver_user = partner.user

    content = f"""
    {_greeting(farmer.first_name or farmer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      The delivery partner you assigned has accepted the delivery task for Order #{order.id}.
    </p>

    <div style="background:linear-gradient(135deg,#ecfdf5,{BRAND_GREEN_LIGHT});
                border-left:4px solid {BRAND_GREEN};border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">🤝</div>
      <div style="font-size:17px;font-weight:800;color:{BRAND_GREEN};">Driver Accepted!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        {partner.name} will pick up Order #{order.id}.
      </div>
    </div>

    {_info_card(
        _info_row('Driver', partner.name) +
        _info_row('Driver Contact', partner.phone or 'N/A') +
        _info_row('Shipment ID', f'#{shipment.id}') +
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Pickup Address', shipment.pickup_address) +
        _info_row('Delivery Address', shipment.delivery_address),
        '🚚', 'Delivery Assignment'
    )}
    """
    subject = f"🤝 Driver Accepted — Order #{order.id} Will Be Delivered by {partner.name}"
    return {
        'subject': subject,
        'html': _base(f"Driver Accepted Order #{order.id}", content),
        'text': f"{partner.name} has accepted the delivery for Order #{order.id}.\nPickup: {shipment.pickup_address}",
    }


# ---------------------------------------------------------------------------
# 12. Driver Rejected — notify farmer
# ---------------------------------------------------------------------------

def farmer_driver_rejected_email(*, transport_offer) -> dict:
    shipment = transport_offer.shipment
    order = shipment.order
    farmer = transport_offer.farmer
    partner = transport_offer.partner

    content = f"""
    {_greeting(farmer.first_name or farmer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      Unfortunately, the delivery partner you assigned has rejected the delivery task for Order #{order.id}.
    </p>

    <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">❌</div>
      <div style="font-size:17px;font-weight:800;color:#dc2626;">Driver Rejected Task</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        {partner.name} has declined Delivery Task for Order #{order.id}.
      </div>
    </div>

    {_info_card(
        _info_row('Driver', partner.name) +
        _info_row('Shipment ID', f'#{shipment.id}') +
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Pickup Address', shipment.pickup_address),
        '📋', 'Task Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Recommended Action:</strong> Log in to your farmer dashboard to assign a different
      delivery partner, or allow another driver to self-assign this open job.
    </p>
    """
    subject = f"❌ Driver Rejected Delivery Task — Order #{order.id}"
    return {
        'subject': subject,
        'html': _base(f"Driver Rejected Order #{order.id}", content),
        'text': f"{partner.name} has rejected the delivery task for Order #{order.id}.\nPlease assign another delivery partner from your farmer dashboard.",
    }


# ---------------------------------------------------------------------------
# 13. Delivery Progress Updates (for consumer & driver)
# ---------------------------------------------------------------------------

SHIPMENT_STATUS_MAP = {
    'assigned': ('Driver Assigned', '🧑‍✈️', '#6366f1', 'Your delivery partner has been assigned and will pick up your order soon.'),
    'picked_up': ('Order Picked Up — In Transit', '🚚', '#0ea5e9', 'Your order has been picked up and is on its way to you!'),
    'handover_completed': ('Transport Handover Completed', '🔄', '#f59e0b', 'Your order has been handed over to the transport partner for final delivery.'),
    'delivered': ('Order Delivered', '🎉', BRAND_GREEN, 'Your order has been successfully delivered. Thank you for choosing KisanConnect!'),
}

def delivery_progress_email(*, user, shipment, new_status: str, role: str = 'consumer') -> dict:
    label, icon, color, description = SHIPMENT_STATUS_MAP.get(
        new_status,
        (new_status.replace('_', ' ').title(), '📦', BRAND_GREEN, 'Delivery status has been updated.')
    )
    order = shipment.order

    content = f"""
    {_greeting(user.first_name or user.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      {'Your delivery' if role == 'consumer' else 'Delivery task'} for Order #{order.id} has been updated.
    </p>

    <div style="background:linear-gradient(135deg,{color}22,{color}11);border-left:4px solid {color};
                border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">{icon}</div>
      <div style="font-size:17px;font-weight:800;color:{color};">{label}</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">{description}</div>
    </div>

    {_info_card(
        _info_row('Shipment ID', f'#{shipment.id}') +
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Current Status', label) +
        (_info_row('Pickup', shipment.pickup_address) if role == 'driver' else '') +
        _info_row('Delivery Address', shipment.delivery_address),
        '🗺️', 'Delivery Details'
    )}
    """
    subject = f"{icon} Order #{order.id} — {label}"
    return {
        'subject': subject,
        'html': _base(f"Delivery Update: {label}", content),
        'text': f"Order #{order.id} delivery update: {label}\n{description}",
    }


# ---------------------------------------------------------------------------
# 14. Farmer Submitted an Offer → Notify Bulk Buyer
# ---------------------------------------------------------------------------

def wholesale_farmer_offer_email(*, bulk_buyer, offer, requirement) -> dict:
    """Sent to Bulk Buyer when a Farmer responds to their BulkRequirement with an offer."""
    farmer = offer.farmer
    farmer_name = (farmer.first_name or farmer.username) if farmer else 'A Farmer'

    total_value = float(offer.quantity) * float(offer.price_per_unit)

    content = f"""
    {_greeting(bulk_buyer.first_name or bulk_buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      A farmer has submitted an offer for your bulk requirement
      <strong>#{requirement.id}</strong> — <strong>{requirement.crop_name}</strong>.
      Review the offer and confirm if it meets your needs.
    </p>

    <!-- Offer Banner -->
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-left:4px solid #3b82f6;
                border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">🌾</div>
      <div style="font-size:17px;font-weight:800;color:#1d4ed8;">New Farmer Offer Received!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        Offer #{offer.id} from {farmer_name} for {requirement.crop_name}
      </div>
    </div>

    {_info_card(
        _info_row('Offer ID', f'#{offer.id}') +
        _info_row('Requirement ID', f'#{requirement.id}') +
        _info_row('Crop', requirement.crop_name) +
        _info_row('Grade / Variety', requirement.grade) +
        _info_row('Quantity Offered', f'{float(offer.quantity)} {requirement.unit}') +
        _info_row('Your Required Qty', f'{float(requirement.quantity)} {requirement.unit}') +
        _info_row('Offered Price', f'₹{float(offer.price_per_unit):.2f}/{requirement.unit}') +
        _info_row('Your Budget Range', f'₹{float(requirement.target_price_min):.2f} – ₹{float(requirement.target_price_max):.2f}/{requirement.unit}') +
        _info_row('Estimated Total', f'₹{total_value:.2f}') +
        _info_row('Delivery Date', str(offer.delivery_date)) +
        _info_row('Farmer', farmer_name) +
        (_info_row('Farmer Notes', offer.notes) if offer.notes else ''),
        '📋', 'Offer Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Next Step:</strong> Log in to your KisanConnect Bulk Buyer dashboard to
      <strong>accept</strong> or <strong>reject</strong> this offer.
      You can also negotiate by submitting a counter-offer.
    </p>
    """
    subject = f"🌾 New Farmer Offer for Your Requirement #{requirement.id} — {requirement.crop_name}"
    return {
        'subject': subject,
        'html': _base(f"Farmer Offer #{offer.id}", content),
        'text': (
            f"A farmer has submitted an offer for your requirement #{requirement.id} ({requirement.crop_name}).\n"
            f"Quantity: {float(offer.quantity)} {requirement.unit} @ ₹{float(offer.price_per_unit):.2f}/{requirement.unit}\n"
            f"Delivery by: {offer.delivery_date}\n"
            f"Log in to your dashboard to accept or reject this offer."
        ),
    }


# ---------------------------------------------------------------------------
# 15. Bulk Buyer Accepted Farmer Offer → Confirmation to Bulk Buyer
# ---------------------------------------------------------------------------

def wholesale_bid_accepted_buyer_email(*, bulk_buyer, offer, order) -> dict:
    """Sent to Bulk Buyer when they accept a FarmerOffer and an order is automatically created."""
    requirement = offer.requirement
    farmer = offer.farmer
    farmer_name = (farmer.first_name or farmer.username) if farmer else 'Farmer'

    total_value = float(offer.quantity) * float(offer.price_per_unit)

    content = f"""
    {_greeting(bulk_buyer.first_name or bulk_buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      You've accepted the wholesale offer from <strong>{farmer_name}</strong>.
      An order has been created and is awaiting payment.
    </p>

    <!-- Success Banner -->
    <div style="background:linear-gradient(135deg,#ecfdf5,{BRAND_GREEN_LIGHT});
                border-left:4px solid {BRAND_GREEN};border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">✅</div>
      <div style="font-size:17px;font-weight:800;color:{BRAND_GREEN};">Wholesale Offer Accepted!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        Order #{order.id} has been created for payment.
      </div>
    </div>

    {_info_card(
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Offer ID', f'#{offer.id}') +
        _info_row('Requirement ID', f'#{requirement.id}') +
        _info_row('Crop', requirement.crop_name) +
        _info_row('Quantity', f'{float(offer.quantity)} {requirement.unit}') +
        _info_row('Confirmed Price', f'₹{float(offer.price_per_unit):.2f}/{requirement.unit}') +
        _info_row('Total Amount', f'₹{total_value:.2f}') +
        _info_row('Delivery Date', str(offer.delivery_date)) +
        _info_row('Farmer', farmer_name) +
        _info_row('Order Status', 'Placed — Awaiting Payment'),
        '💰', 'Confirmed Order Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Next Step:</strong> Complete payment from your KisanConnect dashboard to confirm
      this wholesale order. The farmer will be notified and will begin preparing your produce.
    </p>
    """
    subject = f"✅ Wholesale Offer Accepted — Order #{order.id} Created ({requirement.crop_name})"
    return {
        'subject': subject,
        'html': _base(f"Wholesale Order #{order.id} Created", content),
        'text': (
            f"You accepted the wholesale offer #{offer.id} for {requirement.crop_name}.\n"
            f"Order #{order.id} has been created.\n"
            f"Quantity: {float(offer.quantity)} {requirement.unit} @ ₹{float(offer.price_per_unit):.2f}/{requirement.unit}\n"
            f"Total: ₹{total_value:.2f}\n"
            f"Log in to complete payment."
        ),
    }


# ---------------------------------------------------------------------------
# 16. Farmer Offer Rejected by Bulk Buyer → Notify Farmer
# ---------------------------------------------------------------------------

def wholesale_bid_rejected_farmer_email(*, farmer, offer) -> dict:
    """Sent to Farmer when the Bulk Buyer rejects their FarmerOffer."""
    requirement = offer.requirement
    buyer = requirement.buyer
    buyer_name = (buyer.first_name or buyer.username) if buyer else 'The buyer'

    content = f"""
    {_greeting(farmer.first_name or farmer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      Unfortunately, your wholesale offer has been rejected by the bulk buyer.
      You may submit a revised offer if the requirement is still open.
    </p>

    <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">❌</div>
      <div style="font-size:17px;font-weight:800;color:#dc2626;">Offer Rejected</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        Your offer #{offer.id} for {requirement.crop_name} was declined.
      </div>
    </div>

    {_info_card(
        _info_row('Offer ID', f'#{offer.id}') +
        _info_row('Requirement ID', f'#{requirement.id}') +
        _info_row('Crop', requirement.crop_name) +
        _info_row('Your Quantity', f'{float(offer.quantity)} {requirement.unit}') +
        _info_row('Your Price', f'₹{float(offer.price_per_unit):.2f}/{requirement.unit}') +
        _info_row('Buyer Budget', f'₹{float(requirement.target_price_min):.2f} – ₹{float(requirement.target_price_max):.2f}/{requirement.unit}') +
        _info_row('Status', 'Rejected'),
        '📋', 'Offer Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Tip:</strong> Review the buyer's budget range and consider submitting a revised offer
      if you are able to adjust your price. Log in to your farmer dashboard for details.
    </p>
    """
    subject = f"❌ Your Wholesale Offer #{offer.id} Was Rejected — {requirement.crop_name}"
    return {
        'subject': subject,
        'html': _base(f"Offer #{offer.id} Rejected", content),
        'text': (
            f"Your wholesale offer #{offer.id} for {requirement.crop_name} has been rejected.\n"
            f"Buyer budget: ₹{float(requirement.target_price_min):.2f}–₹{float(requirement.target_price_max):.2f}/{requirement.unit}\n"
            f"You may submit a revised offer if the requirement is still open."
        ),
    }


# ---------------------------------------------------------------------------
# 17. Bulk Buyer Order Status Updates (mirrors consumer order_status_email)
# ---------------------------------------------------------------------------

BULK_STATUS_LABEL_MAP = {
    'placed': ('Wholesale Order Placed', '📋', '#6366f1', 'Your wholesale order has been placed and is awaiting farmer confirmation.'),
    'confirmed': ('Order Confirmed by Farmer', '✅', BRAND_GREEN, 'The farmer has confirmed your wholesale order and will begin preparing it.'),
    'packed': ('Order Packed & Ready', '📦', '#f59e0b', 'Your wholesale order is packed and ready for pickup by the logistics partner.'),
    'in_transit': ('Order Picked Up — In Transit', '🚚', '#0ea5e9', 'Your wholesale order has been picked up and is on its way to you.'),
    'delivered': ('Wholesale Order Delivered', '🎉', BRAND_GREEN, 'Your wholesale order has been successfully delivered. Thank you for choosing KisanConnect!'),
}

def bulk_order_status_email(*, bulk_buyer, order, new_status: str) -> dict:
    """Sent to Bulk Buyer for meaningful wholesale order status transitions."""
    label, icon, color, description = BULK_STATUS_LABEL_MAP.get(
        new_status,
        (new_status.replace('_', ' ').title(), '📋', BRAND_GREEN, 'Your wholesale order status has been updated.')
    )

    items_rows = ''
    for item in order.items.all():
        name = item.product.name if item.product else 'Item'
        unit = item.product.unit if item.product else 'kg'
        items_rows += _info_row(f"{name} × {float(item.quantity)} {unit}", f"₹{float(item.price):.2f}/unit")

    content = f"""
    {_greeting(bulk_buyer.first_name or bulk_buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      Your wholesale order <strong>#{order.id}</strong> status has been updated.
    </p>

    <!-- Status Banner -->
    <div style="background:linear-gradient(135deg,{color}22,{color}11);border-left:4px solid {color};
                border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">{icon}</div>
      <div style="font-size:17px;font-weight:800;color:{color};">{label}</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">{description}</div>
    </div>

    {_info_card(
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Current Status', label) +
        _info_row('Total Amount', f'₹{float(order.total_amount):.2f}') +
        _info_row('Payment', order.payment_status.upper()),
        '📋', 'Wholesale Order Details'
    )}
    {_info_card(items_rows, '🌾', 'Order Items') if items_rows else ''}
    """
    subject = f"{icon} Wholesale Order #{order.id} — {label}"
    return {
        'subject': subject,
        'html': _base(f"Wholesale Order #{order.id}: {label}", content),
        'text': f"Your wholesale order #{order.id} status: {label}\n{description}",
    }


# ---------------------------------------------------------------------------
# 18. Bulk Buyer Order Cancellation
# ---------------------------------------------------------------------------

def bulk_order_cancelled_email(*, bulk_buyer, order) -> dict:
    """Sent to Bulk Buyer when their wholesale order is cancelled."""
    reason = order.cancellation_reason or 'No specific reason provided.'

    items_rows = ''
    for item in order.items.all():
        name = item.product.name if item.product else 'Item'
        unit = item.product.unit if item.product else 'kg'
        items_rows += _info_row(
            f"{name} × {float(item.quantity)} {unit}",
            f"₹{float(item.quantity * item.price):.2f}"
        )

    content = f"""
    {_greeting(bulk_buyer.first_name or bulk_buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      We're sorry — your wholesale order <strong>#{order.id}</strong> has been cancelled.
    </p>

    {_info_card(
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Status', 'Cancelled') +
        _info_row('Reason', reason) +
        _info_row('Original Amount', f'₹{float(order.total_amount):.2f}') +
        _info_row('Payment Status', order.payment_status.upper()),
        '❌', 'Cancellation Details'
    )}
    {_info_card(items_rows, '🌾', 'Cancelled Items') if items_rows else ''}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      {'If you were charged, a refund will be processed to your original payment method within 3–7 business days.' if order.payment_status == 'paid' else 'No charge was made for this order.'}
      If you have questions, please contact us at <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN};">{SUPPORT_EMAIL}</a>.
    </p>
    <p style="font-size:13px;color:{BRAND_MUTED};line-height:1.6;">
      You can post a new bulk requirement on your KisanConnect dashboard to source produce again.
    </p>
    """
    subject = f"Your Wholesale Order #{order.id} Has Been Cancelled — KisanConnect"
    return {
        'subject': subject,
        'html': _base(f"Wholesale Order #{order.id} Cancelled", content),
        'text': (
            f"Your wholesale order #{order.id} has been cancelled.\n"
            f"Reason: {reason}\n"
            f"Amount: ₹{float(order.total_amount):.2f} ({order.payment_status.upper()})\n"
            f"Contact {SUPPORT_EMAIL} if you have questions."
        ),
    }


# ---------------------------------------------------------------------------
# 19. Farmer Counter-Offer on QuoteRequest → Notify Bulk Buyer
# ---------------------------------------------------------------------------

def quote_offer_made_email(*, bulk_buyer, quote) -> dict:
    """Sent to Bulk Buyer when Farmer submits/updates a counter-offer on their QuoteRequest."""
    product = quote.product
    farmer = product.farmer if product else None
    farmer_name = (farmer.first_name or farmer.username) if farmer else 'The farmer'
    offered_price = quote.offered_price or quote.target_price
    original_price = quote.target_price
    total_value = float(quote.quantity) * float(offered_price)

    content = f"""
    {_greeting(bulk_buyer.first_name or bulk_buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      The farmer has responded to your custom quote request
      <strong>#{quote.id}</strong> with a counter-offer. Review it and accept or negotiate.
    </p>

    <!-- Counter-offer Banner -->
    <div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-left:4px solid #eab308;
                border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">🤝</div>
      <div style="font-size:17px;font-weight:800;color:#92400e;">Counter-Offer Received</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        {farmer_name} has proposed a price of ₹{float(offered_price):.2f}/unit
      </div>
    </div>

    {_info_card(
        _info_row('Request ID', f'#{quote.id}') +
        _info_row('Product', product.name if product else 'N/A') +
        _info_row('Quantity', f'{float(quote.quantity)} {product.unit if product else "kg"}') +
        _info_row('Your Requested Price', f'₹{float(original_price):.2f}/unit') +
        _info_row("Farmer's Counter-Offer", f'₹{float(offered_price):.2f}/unit') +
        _info_row('Estimated Total', f'₹{total_value:.2f}') +
        _info_row('Farmer', farmer_name) +
        _info_row('Status', 'Awaiting Your Decision'),
        '📄', 'Quote Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Next Step:</strong> Log in to your KisanConnect dashboard to
      <strong>accept</strong> this counter-offer or submit your own revised price.
    </p>
    """
    subject = f"🤝 Counter-Offer Received on Quote #{quote.id} — {product.name if product else 'Your Request'}"
    return {
        'subject': subject,
        'html': _base(f"Counter-Offer on Quote #{quote.id}", content),
        'text': (
            f"The farmer has made a counter-offer on your request #{quote.id}.\n"
            f"Product: {product.name if product else 'N/A'}\n"
            f"Quantity: {float(quote.quantity)} {product.unit if product else 'kg'}\n"
            f"Your price: ₹{float(original_price):.2f}/unit | Farmer's offer: ₹{float(offered_price):.2f}/unit\n"
            f"Log in to accept or negotiate."
        ),
    }


# ---------------------------------------------------------------------------
# 20. Bulk Buyer Accepts Counter-Offer → Confirmation to Bulk Buyer
# ---------------------------------------------------------------------------

def quote_bid_accepted_buyer_email(*, bulk_buyer, quote, order) -> dict:
    """Sent to Bulk Buyer when they accept the farmer's counter-offer on a QuoteRequest."""
    product = quote.product
    farmer = product.farmer if product else None
    farmer_name = (farmer.first_name or farmer.username) if farmer else 'Farmer'
    final_price = quote.offered_price or quote.target_price
    total_value = float(quote.quantity) * float(final_price)

    content = f"""
    {_greeting(bulk_buyer.first_name or bulk_buyer.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      You've accepted the farmer's counter-offer on your quote request <strong>#{quote.id}</strong>.
      An order has been created and is ready for payment.
    </p>

    <!-- Success Banner -->
    <div style="background:linear-gradient(135deg,#ecfdf5,{BRAND_GREEN_LIGHT});
                border-left:4px solid {BRAND_GREEN};border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">🎉</div>
      <div style="font-size:17px;font-weight:800;color:{BRAND_GREEN};">Quote Request Confirmed!</div>
      <div style="font-size:13px;color:{BRAND_MUTED};margin-top:6px;">
        Order #{order.id} has been created and is awaiting payment.
      </div>
    </div>

    {_info_card(
        _info_row('Order ID', f'#{order.id}') +
        _info_row('Quote Request ID', f'#{quote.id}') +
        _info_row('Product', product.name if product else 'N/A') +
        _info_row('Quantity', f'{float(quote.quantity)} {product.unit if product else "kg"}') +
        _info_row('Agreed Price', f'₹{float(final_price):.2f}/unit') +
        _info_row('Total Amount', f'₹{total_value:.2f}') +
        _info_row('Farmer', farmer_name) +
        _info_row('Order Status', 'Placed — Awaiting Payment'),
        '📄', 'Confirmed Order Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      <strong>Next Step:</strong> Log in to your KisanConnect dashboard to complete payment
      and finalize this order. The farmer will be notified once payment is received.
    </p>
    """
    subject = f"🎉 Quote Request #{quote.id} Accepted — Order #{order.id} Created"
    return {
        'subject': subject,
        'html': _base(f"Quote #{quote.id} Confirmed — Order #{order.id}", content),
        'text': (
            f"You accepted the counter-offer on quote #{quote.id}.\n"
            f"Product: {product.name if product else 'N/A'}\n"
            f"Quantity: {float(quote.quantity)} {product.unit if product else 'kg'} @ ₹{float(final_price):.2f}/unit\n"
            f"Total: ₹{total_value:.2f}\n"
            f"Order #{order.id} created — log in to complete payment."
        ),
    }


# ---------------------------------------------------------------------------
# 21. Quote / Bid Rejected — Notify Affected Party
# ---------------------------------------------------------------------------

def quote_bid_rejected_email(*, recipient, quote, rejected_by: str) -> dict:
    """
    Sent when a QuoteRequest is rejected.

    rejected_by='farmer' → farmer declined buyer's original request → recipient=buyer
    rejected_by='buyer'  → buyer rejected farmer's counter-offer → recipient=farmer
    """
    product = quote.product
    other_party = 'The farmer' if rejected_by == 'farmer' else 'The buyer'
    product_name = product.name if product else 'your product request'

    if rejected_by == 'farmer':
        headline = 'Quote Request Declined by Farmer'
        description = (
            f"Unfortunately, the farmer has declined your quote request "
            f"<strong>#{quote.id}</strong> for <strong>{product_name}</strong>."
        )
        advice = (
            "You can submit a new quote request with an adjusted price, or browse other available "
            "farmers and products on KisanConnect."
        )
    else:
        headline = 'Counter-Offer Rejected by Buyer'
        description = (
            f"The bulk buyer has rejected your counter-offer on quote request "
            f"<strong>#{quote.id}</strong> for <strong>{product_name}</strong>."
        )
        advice = (
            "The buyer may submit a revised request. You can log in to your farmer dashboard "
            "to review and respond to any updated requests."
        )

    final_price = quote.offered_price or quote.target_price

    content = f"""
    {_greeting(recipient.first_name or recipient.username)}
    <p style="font-size:14px;color:{BRAND_MUTED};margin:0 0 20px;line-height:1.6;">
      {description}
    </p>

    <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 12px 12px 0;
                padding:16px 20px;margin:16px 0;">
      <div style="font-size:22px;margin-bottom:6px;">❌</div>
      <div style="font-size:17px;font-weight:800;color:#dc2626;">{headline}</div>
    </div>

    {_info_card(
        _info_row('Request ID', f'#{quote.id}') +
        _info_row('Product', product_name) +
        _info_row('Quantity', f'{float(quote.quantity)} {product.unit if product else "kg"}') +
        _info_row('Requested Price', f'₹{float(quote.target_price):.2f}/unit') +
        (_info_row("Counter-Offer Price", f'₹{float(quote.offered_price):.2f}/unit') if quote.offered_price else '') +
        _info_row('Status', 'Rejected'),
        '📄', 'Quote Details'
    )}

    <p style="font-size:13px;color:{BRAND_MUTED};margin-top:16px;line-height:1.6;">
      {advice}
      For support, contact <a href="mailto:{SUPPORT_EMAIL}" style="color:{BRAND_GREEN};">{SUPPORT_EMAIL}</a>.
    </p>
    """
    subject = f"❌ Quote Request #{quote.id} — {headline}"
    return {
        'subject': subject,
        'html': _base(f"Quote #{quote.id}: {headline}", content),
        'text': (
            f"Quote request #{quote.id} for {product_name} has been rejected by {other_party}.\n"
            f"{advice}"
        ),
    }

