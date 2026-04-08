from flask_mail import Message
from flask import current_app


def build_confirmation_email(confirmation_link, recipient_email):
    """Build branded confirmation email content."""
    subject = "Confirm your Hotel Management System account"
    body = (
        "Welcome to Hotel Management System.\n\n"
        f"Please confirm your email address by opening this link:\n{confirmation_link}\n\n"
        "If you did not register, you can ignore this email."
    )
    html = f"""
    <div style="margin:0;padding:0;background:#0b1220;color:#f8fafc;font-family:Arial,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#111827,#1f2937);border:1px solid rgba(212,175,55,.28);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.28);">
                <div style="padding:32px 32px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08);">
                    <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#d4af37;font-weight:700;">Hotel Management System</div>
                    <h1 style="margin:16px 0 8px;font-size:28px;line-height:1.2;color:#ffffff;">Confirm your email address</h1>
                    <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.6;">We received a registration request for <strong style="color:#ffffff;">{recipient_email}</strong>.</p>
                </div>
                <div style="padding:32px;">
                    <p style="margin:0 0 18px;color:#e2e8f0;font-size:15px;line-height:1.7;">
                        Please confirm your Gmail ID by clicking the button below. Once confirmed, you will be taken directly to your dashboard.
                    </p>
                    <div style="text-align:center;margin:30px 0;">
                        <a href="{confirmation_link}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8891f);color:#111827;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px;font-size:15px;">
                            Confirm Email
                        </a>
                    </div>
                    <p style="margin:0 0 10px;color:#94a3b8;font-size:13px;line-height:1.6;">
                        If the button does not work, copy and paste this link into your browser:
                    </p>
                    <p style="margin:0;word-break:break-all;color:#93c5fd;font-size:13px;line-height:1.6;">{confirmation_link}</p>
                </div>
            </div>
            <p style="text-align:center;color:#64748b;font-size:12px;margin:18px 0 0;">
                If you did not create this account, you can safely ignore this message.
            </p>
        </div>
    </div>
    """
    return subject, body, html

def send_email(subject, recipients, body, html=None):
    """
    Send an email using Flask-Mail.
    :param subject: Email subject
    :param recipients: List of recipient email addresses
    :param body: Plain text body
    :param html: HTML body (optional)
    """
    mail = current_app.extensions.get('mail')
    if not mail:
        raise RuntimeError('Flask-Mail is not initialized')

    missing = [name for name in ('MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD') if not current_app.config.get(name)]
    if missing:
        raise RuntimeError(f"Mail settings are missing: {', '.join(missing)}")

    msg = Message(subject=subject, recipients=recipients, body=body, html=html)
    try:
        mail.send(msg)
    except Exception as exc:
        current_app.logger.exception("SMTP send failed")
        raise RuntimeError(f"SMTP send failed: {exc}") from exc
