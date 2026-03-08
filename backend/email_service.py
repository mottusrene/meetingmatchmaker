# backend/email_service.py
import json
import os

import resend

with open(os.path.join(os.path.dirname(__file__), "content", "en.json"), "r") as f:
    text_dict = json.load(f)["emails"]

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "onboarding@resend.dev")

def _send(to: str, subject: str, body: str):
    """Send an email via Resend, or fall back to console if no API key is set."""
    if RESEND_API_KEY:
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": to,
            "subject": subject,
            "text": body,
        })
    else:
        print("\n" + "="*50)
        print(f"📧 EMAIL (no RESEND_API_KEY set — console only)")
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

def send_suspended_notification(attendee_email: str, name: str, event_title: str):
    template = text_dict["suspendedUser"]
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(name=name, event_title=event_title),
    )

def send_reinstated_notification(attendee_email: str, name: str, event_title: str):
    template = text_dict["reinstatedUser"]
    _send(
        attendee_email,
        template["subject"].format(event_title=event_title),
        template["body"].format(name=name, event_title=event_title),
    )

def send_meeting_notification(to_email: str, template_type: str, **kwargs):
    template = text_dict["meeting"][template_type]
    _send(
        to_email,
        template["subject"].format(**kwargs),
        template["body"].format(**kwargs),
    )
