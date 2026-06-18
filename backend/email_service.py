# backend/email_service.py
import html as _html
import json
import os
import re
import smtplib
import ssl
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Matches http(s) URLs so they can be turned into real anchor tags. Plain-text
# emails let the mail client auto-detect links, but long magic-link URLs get
# broken across line wraps (the token after "?token=" is dropped), so we always
# send an HTML alternative where the whole URL is a single, unbreakable <a>.
_URL_RE = re.compile(r'(https?://[^\s<>"]+)')


def _text_to_html(text: str) -> str:
    """Render a plain-text email body as simple, safe HTML with clickable links."""
    escaped = _html.escape(text)
    linked = _URL_RE.sub(
        lambda m: f'<a href="{m.group(1)}" style="color:#4f46e5;">{m.group(1)}</a>',
        escaped,
    )
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;'
        'line-height:1.6;color:#111827;">'
        + linked.replace("\n", "<br>")
        + "</div>"
    )

with open(os.path.join(os.path.dirname(__file__), "content", "en.json"), "r") as f:
    text_dict = json.load(f)["emails"]

POSTMARK_SERVER_TOKEN = os.environ.get("POSTMARK_SERVER_TOKEN")
POSTMARK_MESSAGE_STREAM = os.environ.get("POSTMARK_MESSAGE_STREAM", "outbound")
POSTMARK_API_URL = "https://api.postmarkapp.com/email"

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.zone.eu")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
FROM_EMAIL = os.environ.get("FROM_EMAIL", SMTP_USER)

def _send_postmark(to: str, subject: str, body: str, html_body: str) -> bool:
    payload = json.dumps({
        "From": FROM_EMAIL,
        "To": to,
        "Subject": subject,
        "TextBody": body,
        "HtmlBody": html_body,
        "MessageStream": POSTMARK_MESSAGE_STREAM,
    }).encode("utf-8")
    req = urllib.request.Request(
        POSTMARK_API_URL,
        data=payload,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return 200 <= resp.status < 300
    except urllib.error.HTTPError as e:
        print(f"⚠️  Postmark rejected email to {to} ({e.code}): {e.read().decode(errors='replace')}")
    except Exception as e:
        print(f"⚠️  Postmark request failed ({e})")
    return False

def _send_smtp(to: str, subject: str, body: str, html_body: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to
        msg.attach(MIMEText(body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to, msg.as_string())
        return True
    except Exception as e:
        print(f"⚠️  SMTP failed ({e})")
        return False

def _send(to: str, subject: str, body: str):
    """Send via Postmark; fall back to SMTP, then console, if not configured."""
    html_body = _text_to_html(body)
    if POSTMARK_SERVER_TOKEN and _send_postmark(to, subject, body, html_body):
        return
    if not POSTMARK_SERVER_TOKEN and SMTP_USER and SMTP_PASS and _send_smtp(to, subject, body, html_body):
        return
    print("\n" + "="*50)
    print(f"📧 EMAIL (console fallback)")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("="*50 + "\n")

def send_host_welcome_email(host_email: str, event_title: str, admin_link: str):
    template = text_dict["hostWelcome"]
    _send(
        host_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(event_title=event_title, admin_link=admin_link),
    )

def send_attendee_magic_link(attendee_email: str, name: str, event_title: str, magic_link: str):
    template = text_dict["attendeeMagicLink"]
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(name=name, event_title=event_title, magic_link=magic_link),
    )

def send_login_link_resend(attendee_email: str, name: str, event_title: str, magic_link: str):
    template = text_dict["resendLink"]
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(name=name, event_title=event_title, magic_link=magic_link),
    )

def send_removed_notification(attendee_email: str, name: str, event_title: str):
    template = text_dict["removedUser"]
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(name=name, event_title=event_title),
    )

def send_suspended_notification(attendee_email: str, name: str, event_title: str, message: str | None = None):
    template = text_dict["suspendedUser"]
    body = template["body"].format(name=name, event_title=event_title)
    if message:
        body += f"\n\nMessage from the host:\n\"{message}\""
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        body,
    )

def send_reinstated_notification(attendee_email: str, name: str, event_title: str):
    template = text_dict["reinstatedUser"]
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(name=name, event_title=event_title),
    )

def send_bulk_invite(attendee_email: str, name: str, company: str | None, bio: str | None, event_title: str, host_name: str, confirm_link: str, decline_link: str):
    template = text_dict["bulkInvite"]
    company_line = f"\n- Company: {company}" if company else ""
    bio_line = f"\n- Bio: {bio}" if bio else ""
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(
            name=name,
            event_title=event_title,
            host_name=host_name,
            company_line=company_line,
            bio_line=bio_line,
            confirm_link=confirm_link,
            decline_link=decline_link,
        ),
    )

def send_broadcast(attendee_email: str, name: str, event_title: str, message: str):
    template = text_dict["broadcast"]
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(name=name, event_title=event_title, message=message),
    )

def send_meeting_notification(to_email: str, template_type: str, **kwargs):
    template = text_dict["meeting"][template_type]
    try:
        subject = template["subject"].format(**kwargs)
        body = template["body"].format(**kwargs)
    except KeyError as e:
        # A missing template variable must never break the API request that triggered the email
        print(f"⚠️  Email template 'meeting.{template_type}' missing variable {e}; email to {to_email} not sent.")
        return
    _send(to_email, subject, body)
