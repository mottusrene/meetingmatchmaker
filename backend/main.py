from fastapi import FastAPI, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel as PydanticModel
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from typing import List
import uuid
import os
from datetime import datetime, timedelta
import asyncio

def get_real_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=get_real_ip)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

import models
import schemas
from database import SessionLocal, engine
from email_service import send_host_welcome_email, send_attendee_magic_link, send_meeting_notification, send_removed_notification, send_suspended_notification, send_reinstated_notification, send_broadcast

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Matchmaking Application MVP")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup_event():
    # Run lightweight SQLite column migrations for any new fields
    db = SessionLocal()
    try:
        for migration in [
            "ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT 0",
            "ALTER TABLE users ADD COLUMN report_comment TEXT",
            "ALTER TABLE events ADD COLUMN banner_url TEXT",
            "ALTER TABLE events ADD COLUMN website TEXT",
            "ALTER TABLE meetings ADD COLUMN request_message TEXT",
            "ALTER TABLE meetings ADD COLUMN table_number INTEGER",
        ]:
            try:
                db.execute(text(migration))
                db.commit()
            except Exception:
                pass  # Column already exists
    finally:
        db.close()
    asyncio.create_task(cleanup_expired_events())

async def cleanup_expired_events():
    while True:
        try:
            db = SessionLocal()
            events = db.query(models.Event).all()
            now = datetime.utcnow()
            for e in events:
                if not e.timeslots:
                    continue
                max_end = max([t.end_time for t in e.timeslots])
                if now > max_end + timedelta(hours=24):
                    db.query(models.Message).filter(models.Message.meeting_id.in_(
                        db.query(models.Meeting.id).filter(models.Meeting.event_id == e.id)
                    )).delete(synchronize_session=False)
                    db.query(models.Meeting).filter(models.Meeting.event_id == e.id).delete()
                    db.query(models.UserAvailability).filter(models.UserAvailability.timeslot_id.in_(
                        db.query(models.TimeSlot.id).filter(models.TimeSlot.event_id == e.id)
                    )).delete(synchronize_session=False)
                    db.query(models.TimeSlot).filter(models.TimeSlot.event_id == e.id).delete()
                    db.query(models.Location).filter(models.Location.event_id == e.id).delete()
                    db.query(models.User).filter(models.User.event_id == e.id).delete()
                    db.delete(e)
            db.commit()
            db.close()
        except:
            pass
        await asyncio.sleep(60 * 60) # Run every hour

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",  # Allow any HTTP/HTTPS origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "API is running"}

# Host Endpoints

@app.post("/events/", response_model=schemas.Event)
@limiter.limit("10/hour")
def create_event(request: Request, event: schemas.EventCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Event).filter(models.Event.host_email == event.host_email).count()
    if existing >= 3:
        raise HTTPException(status_code=429, detail="Maximum of 3 events per email address reached.")
    access_code = str(uuid.uuid4())[:8].upper() # Simple short code for MVP
    admin_code = f"host/{str(uuid.uuid4())}"
    db_event = models.Event(
        title=event.title,
        description=event.description,
        passcode=event.passcode,
        host_email=event.host_email,
        access_code=access_code,
        admin_code=admin_code,
        location=event.location,
        start_date=event.start_date,
        end_date=event.end_date
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    if event.host_email:
        admin_link = f"{FRONTEND_URL}/host/{access_code}?token={admin_code}"
        send_host_welcome_email(event.host_email, event.title, admin_link)
        
    return db_event

@app.get("/events/{access_code}", response_model=schemas.Event)
def get_event(access_code: str, db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.access_code == access_code).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event

@app.put("/events/{access_code}", response_model=schemas.EventBase)
def update_event(
    access_code: str, 
    event_update: schemas.EventUpdate, 
    db: Session = Depends(get_db),
    authorization: str = Header(None)
):
    db_event = db.query(models.Event).filter(models.Event.access_code == access_code).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if db_event.admin_code != authorization:
        raise HTTPException(status_code=403, detail="Not authorized to edit this event")
        
    if event_update.title is not None:
        db_event.title = event_update.title
    if event_update.description is not None:
        db_event.description = event_update.description
    if event_update.logo_url is not None:
        db_event.logo_url = event_update.logo_url
    if event_update.banner_url is not None:
        db_event.banner_url = event_update.banner_url
    if event_update.website is not None:
        db_event.website = event_update.website
    if event_update.location is not None:
        db_event.location = event_update.location
    if event_update.start_date is not None:
        db_event.start_date = event_update.start_date
    if event_update.end_date is not None:
        db_event.end_date = event_update.end_date
        
    db.commit()
    db.refresh(db_event)
    return db_event

@app.delete("/events/{access_code}")
def delete_event(
    access_code: str, 
    db: Session = Depends(get_db),
    authorization: str = Header(None)
):
    db_event = db.query(models.Event).filter(models.Event.access_code == access_code).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if db_event.admin_code != authorization:
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
        
    # Cascade delete all related tables explicitly
    meeting_ids = [m.id for m in db.query(models.Meeting.id).filter(models.Meeting.event_id == db_event.id).all()]
    if meeting_ids:
        db.query(models.Message).filter(models.Message.meeting_id.in_(meeting_ids)).delete(synchronize_session=False)
        db.query(models.Meeting).filter(models.Meeting.id.in_(meeting_ids)).delete(synchronize_session=False)
        
    user_ids = [u.id for u in db.query(models.User.id).filter(models.User.event_id == db_event.id).all()]
    if user_ids:
        db.query(models.UserAvailability).filter(models.UserAvailability.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.id.in_(user_ids)).delete(synchronize_session=False)
        
    db.query(models.TimeSlot).filter(models.TimeSlot.event_id == db_event.id).delete(synchronize_session=False)
    db.query(models.Location).filter(models.Location.event_id == db_event.id).delete(synchronize_session=False)
    
    db.delete(db_event)
    db.commit()
    return {"detail": "Event cleanly deleted"}

@app.post("/events/{access_code}/locations/", response_model=schemas.Location)
def create_location(access_code: str, location: schemas.LocationCreate, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    db_location = models.Location(name=location.name, event_id=db_event.id, capacity=location.capacity)
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@app.post("/events/{access_code}/timeslots/", response_model=schemas.TimeSlot)
def create_timeslot(access_code: str, timeslot: schemas.TimeSlotCreate, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    db_timeslot = models.TimeSlot(
        start_time=timeslot.start_time,
        end_time=timeslot.end_time,
        event_id=db_event.id
    )
    db.add(db_timeslot)
    db.commit()
    db.refresh(db_timeslot)
    return db_timeslot

@app.get("/events/{access_code}/locations/", response_model=List[schemas.Location])
def list_locations(access_code: str, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    return db_event.locations

@app.delete("/events/{access_code}/locations/{location_id}")
def delete_location(access_code: str, location_id: int, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    db_loc = db.query(models.Location).filter(models.Location.id == location_id, models.Location.event_id == db_event.id).first()
    if not db_loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(db_loc)
    db.commit()
    return {"message": "Location deleted"}

@app.get("/events/{access_code}/timeslots/", response_model=List[schemas.TimeSlot])
def list_timeslots(access_code: str, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    return db_event.timeslots

@app.delete("/events/{access_code}/timeslots/{timeslot_id}")
def delete_timeslot(access_code: str, timeslot_id: int, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    db_ts = db.query(models.TimeSlot).filter(models.TimeSlot.id == timeslot_id, models.TimeSlot.event_id == db_event.id).first()
    if not db_ts:
        raise HTTPException(status_code=404, detail="Time slot not found")
    db.delete(db_ts)
    db.commit()
    return {"message": "Time slot deleted"}

# Attendee Endpoints

@app.post("/events/{access_code}/users/", response_model=schemas.UserPrivate)
@limiter.limit("10/minute")
def create_user(request: Request, access_code: str, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    
    # We removed global unique email constraint so users can join multiple events with the same email.
    # But check if they already joined THIS event.
    db_user = db.query(models.User).filter(models.User.email == user.email, models.User.event_id == db_event.id).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered for this event")
    
    session_token = str(uuid.uuid4())
    avatar_url = f"https://ui-avatars.com/api/?name={user.name.replace(' ', '+')}&background=random"
    
    db_user = models.User(
        event_id=db_event.id,
        name=user.name,
        email=user.email,
        company=user.company,
        bio=user.bio,
        profile_link=user.profile_link,
        avatar_url=avatar_url,
        session_token=session_token,
        is_host=user.is_host
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Add initial availability if provided
    if user.available_timeslot_ids:
        for ts_id in user.available_timeslot_ids:
             # Verify timeslot belongs to event
             ts = db.query(models.TimeSlot).filter(models.TimeSlot.id == ts_id, models.TimeSlot.event_id == db_event.id).first()
             if ts:
                 db_user.available_timeslots.append(ts)
        db.commit()
    
    magic_link = f"{FRONTEND_URL}/event/{access_code}?token={session_token}"
    send_attendee_magic_link(user.email, user.name, db_event.title, magic_link)
    
    return db_user

@app.get("/users/me", response_model=schemas.UserPrivate)
def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    db_user = db.query(models.User).filter(models.User.session_token == authorization).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return db_user

@app.get("/users/", response_model=List[schemas.User])
def list_users(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")
    requester = db.query(models.User).filter(models.User.session_token == authorization).first()
    if not requester:
        raise HTTPException(status_code=401, detail="Invalid token")
    return db.query(models.User).filter(models.User.event_id == requester.event_id).all()

@app.get("/users/{user_id}", response_model=schemas.User)
def get_user(user_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")
    requester = db.query(models.User).filter(models.User.session_token == authorization).first()
    if not requester:
        raise HTTPException(status_code=401, detail="Invalid token")
    db_user = db.query(models.User).filter(models.User.id == user_id, models.User.event_id == requester.event_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, authorization: str = Header(None), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not authorization or db_user.session_token != authorization:
        raise HTTPException(status_code=403, detail="Forbidden")

    if user_update.name is not None:
        db_user.name = user_update.name
    if user_update.company is not None:
        db_user.company = user_update.company
    if user_update.bio is not None:
        db_user.bio = user_update.bio
    if user_update.profile_link is not None:
        db_user.profile_link = user_update.profile_link
    if user_update.avatar_url is not None:
        db_user.avatar_url = user_update.avatar_url
    
    if user_update.available_timeslot_ids is not None:
        db_user.available_timeslots = []
        for ts_id in user_update.available_timeslot_ids:
             ts = db.query(models.TimeSlot).filter(models.TimeSlot.id == ts_id, models.TimeSlot.event_id == db_user.event_id).first()
             if ts:
                 db_user.available_timeslots.append(ts)
                 
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not authorization or db_user.session_token != authorization:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Delete associated meetings
    db.query(models.Meeting).filter(
        (models.Meeting.requester_id == user_id) | (models.Meeting.receiver_id == user_id)
    ).delete()
    
    # Clear availability relationships
    db_user.available_timeslots = []
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

class ReportBody(PydanticModel):
    comment: str = ""

@app.post("/users/{user_id}/report")
@limiter.limit("5/minute")
def report_user(request: Request, user_id: int, body: ReportBody, authorization: str = Header(None), db: Session = Depends(get_db)):
    # Verify the reporter is a valid user
    reporter = db.query(models.User).filter(models.User.session_token == authorization).first()
    if not reporter:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.is_flagged = True
    if body.comment:
        db_user.report_comment = body.comment
    db.commit()
    return {"message": "User reported successfully"}

@app.delete("/events/{access_code}/users/{user_id}")
def host_delete_user(access_code: str, user_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)
    
    # Must be the event host
    if db_event.admin_code != authorization:
        raise HTTPException(status_code=403, detail="Not authorized to delete users for this event")
        
    db_user = db.query(models.User).filter(models.User.id == user_id, models.User.event_id == db_event.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Capture info for email
    user_email = db_user.email
    user_name = db_user.name
    
    # Cascade delete
    db.query(models.Meeting).filter(
        (models.Meeting.requester_id == user_id) | (models.Meeting.receiver_id == user_id)
    ).delete()
    db_user.available_timeslots = []
    
    db.delete(db_user)
    db.commit()
    
    send_removed_notification(user_email, user_name, db_event.title)

    return {"message": "User forcibly removed from event"}

@app.put("/events/{access_code}/users/{user_id}/suspend")
def host_suspend_user(access_code: str, user_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)

    if db_event.admin_code != authorization:
        raise HTTPException(status_code=403, detail="Not authorized")

    db_user = db.query(models.User).filter(models.User.id == user_id, models.User.event_id == db_event.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.is_suspended = True

    # Cancel all their pending and accepted meetings
    affected_meetings = db.query(models.Meeting).filter(
        (models.Meeting.requester_id == user_id) | (models.Meeting.receiver_id == user_id),
        models.Meeting.status.in_(["pending", "accepted"])
    ).all()

    for meeting in affected_meetings:
        meeting.status = "cancelled"
        # Notify the other party
        other_user_id = meeting.receiver_id if meeting.requester_id == user_id else meeting.requester_id
        other_user = db.query(models.User).filter(models.User.id == other_user_id).first()
        if other_user:
            send_meeting_notification(
                other_user.email,
                "cancelled",
                name=other_user.name,
                event_title=db_event.title
            )

    db.commit()
    send_suspended_notification(db_user.email, db_user.name, db_event.title)
    return {"message": "User suspended"}

@app.put("/events/{access_code}/users/{user_id}/unsuspend")
def host_unsuspend_user(access_code: str, user_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)

    if db_event.admin_code != authorization:
        raise HTTPException(status_code=403, detail="Not authorized")

    db_user = db.query(models.User).filter(models.User.id == user_id, models.User.event_id == db_event.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.is_suspended = False
    db.commit()
    send_reinstated_notification(db_user.email, db_user.name, db_event.title)
    return {"message": "User reinstated"}

# Matchmaking (Meetings)

@app.get("/events/{access_code}/attendees/", response_model=List[schemas.User])
def get_event_attendees(access_code: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.access_code == access_code).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not authorization or db_event.admin_code != authorization:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.User).filter(models.User.event_id == db_event.id, models.User.is_host == False).all()

class BroadcastBody(PydanticModel):
    message: str

@app.post("/events/{access_code}/broadcast")
async def broadcast_message(access_code: str, body: BroadcastBody, authorization: str = Header(None), db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.access_code == access_code).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not authorization or db_event.admin_code != authorization:
        raise HTTPException(status_code=403, detail="Not authorized")
    attendees = db.query(models.User).filter(
        models.User.event_id == db_event.id,
        models.User.is_host == False,
        models.User.is_suspended == False,
    ).all()
    for attendee in attendees:
        send_broadcast(attendee.email, attendee.name, db_event.title, body.message)
        await asyncio.sleep(0.1)
    return {"sent": len(attendees)}

@app.post("/events/{access_code}/meetings/", response_model=schemas.Meeting)
@limiter.limit("20/minute")
def create_meeting(request: Request, access_code: str, requester_id: int, meeting: schemas.MeetingCreate, db: Session = Depends(get_db)):
    db_event = get_event(access_code, db)

    # Check suspension status
    requester_user = db.query(models.User).filter(models.User.id == requester_id).first()
    if requester_user and requester_user.is_suspended:
        raise HTTPException(status_code=403, detail="Your account is currently suspended.")
    receiver_user = db.query(models.User).filter(models.User.id == meeting.receiver_id).first()
    if receiver_user and receiver_user.is_suspended:
        raise HTTPException(status_code=400, detail="This attendee is currently unavailable.")

    # Check if requester is already busy (pending or accepted)
    requester_conflict = db.query(models.Meeting).filter(
        models.Meeting.timeslot_id == meeting.timeslot_id,
        (models.Meeting.requester_id == requester_id) | (models.Meeting.receiver_id == requester_id),
        models.Meeting.status.in_(["pending", "accepted"])
    ).first()
    if requester_conflict:
        raise HTTPException(status_code=400, detail="You already have a meeting requested or scheduled for this time.")

    # Check if receiver is already booked (accepted ONLY)
    receiver_conflict = db.query(models.Meeting).filter(
        models.Meeting.timeslot_id == meeting.timeslot_id,
        (models.Meeting.requester_id == meeting.receiver_id) | (models.Meeting.receiver_id == meeting.receiver_id),
        models.Meeting.status == "accepted"
    ).first()
    if receiver_conflict:
        raise HTTPException(status_code=400, detail="The attendee is already booked for this time.")

    # Check if location is already booked
    location = db.query(models.Location).filter(models.Location.id == meeting.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
        
    location_conflict_count = db.query(models.Meeting).filter(
        models.Meeting.timeslot_id == meeting.timeslot_id,
        models.Meeting.location_id == meeting.location_id,
        models.Meeting.status == "accepted"
    ).count()
    if location_conflict_count >= location.capacity:
        raise HTTPException(status_code=400, detail="The location is already full at this time.")

    db_meeting = models.Meeting(
        event_id=db_event.id,
        requester_id=requester_id,
        receiver_id=meeting.receiver_id,
        location_id=meeting.location_id,
        timeslot_id=meeting.timeslot_id,
        status="pending",
        request_message=meeting.request_message or None,
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    
    requester = db.query(models.User).filter(models.User.id == requester_id).first()
    receiver = db.query(models.User).filter(models.User.id == meeting.receiver_id).first()
    if requester and receiver:
        timeslot = db.query(models.TimeSlot).filter(models.TimeSlot.id == db_meeting.timeslot_id).first()
        location = db.query(models.Location).filter(models.Location.id == db_meeting.location_id).first()
        start_str = timeslot.start_time.strftime("%d %b %Y, %H:%M") if timeslot else "TBD"
        end_str = timeslot.end_time.strftime("%H:%M") if timeslot else "TBD"
        location_name = location.name if location else "TBD"
        receiver_link = f"{FRONTEND_URL}/event/{db_event.access_code}?token={receiver.session_token}"
        msg_block = f"\n\nMessage from {requester.name}:\n\"{db_meeting.request_message}\"" if db_meeting.request_message else ""
        send_meeting_notification(
            receiver.email,
            "request",
            requester_name=requester.name,
            receiver_name=receiver.name,
            event_title=db_event.title,
            start_time=start_str,
            end_time=end_str,
            location_name=location_name,
            magic_link=receiver_link,
            request_message_block=msg_block,
        )

    return db_meeting

@app.get("/users/{user_id}/meetings/", response_model=List[schemas.Meeting])
def get_user_meetings(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Meeting).filter(
        (models.Meeting.requester_id == user_id) | (models.Meeting.receiver_id == user_id)
    ).all()

@app.put("/meetings/{meeting_id}/status", response_model=schemas.Meeting)
def update_meeting_status(meeting_id: int, status: str, db: Session = Depends(get_db)):
    if status not in ["pending", "accepted", "declined", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    if status == "accepted":
        # Check receiver conflict
        receiver_conflict = db.query(models.Meeting).filter(
            models.Meeting.timeslot_id == db_meeting.timeslot_id,
            (models.Meeting.requester_id == db_meeting.receiver_id) | (models.Meeting.receiver_id == db_meeting.receiver_id),
            models.Meeting.status == "accepted",
            models.Meeting.id != meeting_id
        ).first()
        if receiver_conflict:
            raise HTTPException(status_code=400, detail="You are already booked for this time.")
            
        # Check requester conflict
        requester_conflict = db.query(models.Meeting).filter(
            models.Meeting.timeslot_id == db_meeting.timeslot_id,
            (models.Meeting.requester_id == db_meeting.requester_id) | (models.Meeting.receiver_id == db_meeting.requester_id),
            models.Meeting.status == "accepted",
            models.Meeting.id != meeting_id
        ).first()
        if requester_conflict:
            raise HTTPException(status_code=400, detail="The requester is already booked for this time.")

        # Check location conflict
        location = db.query(models.Location).filter(models.Location.id == db_meeting.location_id).first()
        location_conflict_count = db.query(models.Meeting).filter(
            models.Meeting.timeslot_id == db_meeting.timeslot_id,
            models.Meeting.location_id == db_meeting.location_id,
            models.Meeting.status == "accepted",
            models.Meeting.id != meeting_id
        ).count()
        if location_conflict_count >= location.capacity:
            raise HTTPException(status_code=400, detail="The location is already full at this time.")

        # Assign next available table number at this location+timeslot
        used_tables = db.query(models.Meeting.table_number).filter(
            models.Meeting.timeslot_id == db_meeting.timeslot_id,
            models.Meeting.location_id == db_meeting.location_id,
            models.Meeting.status == "accepted",
            models.Meeting.id != meeting_id,
        ).all()
        used = {row[0] for row in used_tables if row[0] is not None}
        table_num = 1
        while table_num in used:
            table_num += 1
        db_meeting.table_number = table_num

    db_meeting.status = status
    db.commit()
    db.refresh(db_meeting)
    
    requester = db.query(models.User).filter(models.User.id == db_meeting.requester_id).first()
    receiver = db.query(models.User).filter(models.User.id == db_meeting.receiver_id).first()
    if requester and receiver:
        db_event = db.query(models.Event).filter(models.Event.id == db_meeting.event_id).first()
        timeslot = db.query(models.TimeSlot).filter(models.TimeSlot.id == db_meeting.timeslot_id).first()
        location = db.query(models.Location).filter(models.Location.id == db_meeting.location_id).first()
        start_str = timeslot.start_time.strftime("%d %b %Y, %H:%M") if timeslot else "TBD"
        end_str = timeslot.end_time.strftime("%H:%M") if timeslot else "TBD"
        location_name = location.name if location else "TBD"
        requester_link = f"{FRONTEND_URL}/event/{db_event.access_code}?token={requester.session_token}"
        receiver_link = f"{FRONTEND_URL}/event/{db_event.access_code}?token={receiver.session_token}"
        if status in ["accepted", "declined"]:
            table_str = f", Table {db_meeting.table_number}" if db_meeting.table_number else ""
            send_meeting_notification(
                requester.email,
                status,
                requester_name=requester.name,
                receiver_name=receiver.name,
                event_title=db_event.title,
                start_time=start_str,
                end_time=end_str,
                location_name=location_name,
                table_str=table_str,
                magic_link=requester_link,
            )
        elif status == "cancelled":
            send_meeting_notification(
                requester.email,
                "cancelled",
                name=requester.name,
                event_title=db_event.title,
                magic_link=requester_link,
            )
            send_meeting_notification(
                receiver.email,
                "cancelled",
                name=receiver.name,
                event_title=db_event.title,
                magic_link=receiver_link,
            )
            
    return db_meeting

@app.get("/meetings/{meeting_id}/calendar", response_class=PlainTextResponse)
def get_meeting_calendar(meeting_id: int, db: Session = Depends(get_db)):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m or m.status != "accepted":
        raise HTTPException(404, "Meeting not found or not accepted")
    
    dtstart = m.timeslot.start_time.strftime("%Y%m%dT%H%M%SZ")
    dtend = m.timeslot.end_time.strftime("%Y%m%dT%H%M%SZ")
    now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Matchmaking App//EN
BEGIN:VEVENT
UID:{m.id}-{now}@matchmaking
DTSTAMP:{now}
DTSTART:{dtstart}
DTEND:{dtend}
SUMMARY:Meeting with {m.requester.name} and {m.receiver.name}
LOCATION:{m.location.name}
DESCRIPTION:Matchmaking Event Meeting
END:VEVENT
END:VCALENDAR"""
    
    return PlainTextResponse(content=ics_content, media_type="text/calendar", headers={"Content-Disposition": f"attachment; filename=meeting_{m.id}.ics"})

@app.post("/meetings/{meeting_id}/messages", response_model=schemas.Message)
def send_message(meeting_id: int, message: schemas.MessageCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = db.query(models.User).filter(models.User.session_token == authorization).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    if user.is_suspended:
        raise HTTPException(status_code=403, detail="Your account is currently suspended.")

    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m or m.status != "accepted":
        raise HTTPException(404, "Meeting not found or not accepted")

    if user.id not in [m.requester_id, m.receiver_id]:
        raise HTTPException(403, "Forbidden")

    db_message = models.Message(
        meeting_id=meeting_id,
        sender_id=user.id,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Notify other user
    other_user = m.receiver if user.id == m.requester_id else m.requester
    event = db.query(models.Event).filter(models.Event.id == m.event_id).first()
    send_meeting_notification(
        other_user.email,
        "message",
        sender_name=user.name,
        receiver_name=other_user.name,
        event_title=event.title,
        content=message.content
    )
    
    return db_message

@app.get("/meetings/{meeting_id}/messages", response_model=List[schemas.Message])
def get_messages(meeting_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = db.query(models.User).filter(models.User.session_token == authorization).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
        
    if user.id not in [m.requester_id, m.receiver_id]:
        raise HTTPException(403, "Forbidden")
        
    return m.messages
