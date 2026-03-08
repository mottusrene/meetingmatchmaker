# backend/email_service.py
# In a real MVP, you'd use smtplib or a service like Resend/SendGrid. 
# For this local MVP, we are mocking the email sending to print directly to the terminal.
import json
import os

with open(os.path.join(os.path.dirname(__file__), "content", "en.json"), "r") as f:
    text_dict = json.load(f)["emails"]

def send_host_welcome_email(host_email: str, event_title: str, admin_link: str):
    template = text_dict["hostWelcome"]
    subject = template["subject"].format(event_title=event_title)
    body = template["body"].format(event_title=event_title, admin_link=admin_link)
    print("\n" + "="*50)
    print(f"📧 EMAIL SENT TO HOST: {host_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("="*50 + "\n")

def send_attendee_magic_link(attendee_email: str, name: str, event_title: str, magic_link: str):
    template = text_dict["attendeeMagicLink"]
    subject = template["subject"].format(event_title=event_title)
    body = template["body"].format(name=name, event_title=event_title, magic_link=magic_link)
    print("\n" + "="*50)
    print(f"📧 EMAIL SENT TO ATTENDEE: {attendee_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("="*50 + "\n")

def send_suspended_notification(attendee_email: str, name: str, event_title: str):
    template = text_dict["suspendedUser"]
    subject = template["subject"].format(event_title=event_title)
    body = template["body"].format(name=name, event_title=event_title)
    print("\n" + "="*50)
    print(f"📧 EMAIL SENT TO SUSPENDED ATTENDEE: {attendee_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("="*50 + "\n")

def send_reinstated_notification(attendee_email: str, name: str, event_title: str):
    template = text_dict["reinstatedUser"]
    subject = template["subject"].format(event_title=event_title)
    body = template["body"].format(name=name, event_title=event_title)
    print("\n" + "="*50)
    print(f"📧 EMAIL SENT TO REINSTATED ATTENDEE: {attendee_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("="*50 + "\n")

def send_removed_notification(attendee_email: str, name: str, event_title: str):
    template = text_dict["removedUser"]
    subject = template["subject"].format(event_title=event_title)
    body = template["body"].format(name=name, event_title=event_title)
    print("\n" + "="*50)
    print(f"📧 EMAIL SENT TO REMOVED ATTENDEE: {attendee_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("="*50 + "\n")

def send_meeting_notification(to_email: str, template_type: str, **kwargs):
    template = text_dict["meeting"][template_type]
    subject = template["subject"].format(**kwargs)
    body = template["body"].format(**kwargs)
    print("\n" + "="*50)
    print(f"📧 MEETING NOTIFICATION SENT TO: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("="*50 + "\n")
