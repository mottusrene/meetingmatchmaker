# backend/email_service.py
import json
import os
import smtplib
import ssl
from email.mime.text import MIMEText

with open(os.path.join(os.path.dirname(__file__), "content", "en.json"), "r") as f:
    text_dict = json.load(f)["emails"]

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.zone.eu")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
FROM_EMAIL = os.environ.get("FROM_EMAIL", SMTP_USER)

def _send(to: str, subject: str, body: str):
    """Send an email via SMTP, or fall back to console if credentials are not set."""
    if SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL
            msg["To"] = to
            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(FROM_EMAIL, to, msg.as_string())
            return
        except Exception as e:
            print(f"⚠️  SMTP failed ({e}), falling back to console.")
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

def send_bulk_invite(attendee_email: str, name: str, company: str | None, bio: str | None, event_title: str, host_email: str, confirm_link: str, decline_link: str):
    template = text_dict["bulkInvite"]
    company_line = f"\n- Company: {company}" if company else ""
    bio_line = f"\n- Bio: {bio}" if bio else ""
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(
            name=name,
            event_title=event_title,
            host_email=host_email,
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
    _send(
        to_email,
        template["subject"].format(**kwargs),
        template["body"].format(**kwargs),
    )
