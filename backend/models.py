from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship

from database import Base

class UserAvailability(Base):
    __tablename__ = "user_availability"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    timeslot_id = Column(Integer, ForeignKey("timeslots.id"), primary_key=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    name = Column(String, index=True)
    email = Column(String, index=True) # Removed unique=True so a user can join multiple distinct events with same email
    company = Column(String)
    bio = Column(String)
    profile_link = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    session_token = Column(String, unique=True, index=True)
    is_host = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    is_suspended = Column(Boolean, default=False)
    report_comment = Column(String, nullable=True)
    event = relationship("Event", back_populates="attendees")
    available_timeslots = relationship("TimeSlot", secondary="user_availability")
    meetings_requested = relationship("Meeting", foreign_keys="[Meeting.requester_id]", back_populates="requester")
    meetings_received = relationship("Meeting", foreign_keys="[Meeting.receiver_id]", back_populates="receiver")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    access_code = Column(String, unique=True, index=True)
    admin_code = Column(String, unique=True, index=True)
    host_email = Column(String)
    passcode = Column(String)
    title = Column(String)
    description = Column(String)
    logo_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)
    location = Column(String, nullable=True) # Overall event location (e.g., "Grand Hotel")
    start_date = Column(DateTime, nullable=True) # Explicit start date
    end_date = Column(DateTime, nullable=True) # Explicit end date for cleanup
    
    attendees = relationship("User", back_populates="event")
    locations = relationship("Location", back_populates="event")
    timeslots = relationship("TimeSlot", back_populates="event")
    meetings = relationship("Meeting", back_populates="event")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    name = Column(String)
    capacity = Column(Integer, default=1)
    
    event = relationship("Event", back_populates="locations")
    meetings = relationship("Meeting", back_populates="location")

class TimeSlot(Base):
    __tablename__ = "timeslots"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    
    event = relationship("Event", back_populates="timeslots")
    meetings = relationship("Meeting", back_populates="timeslot")

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    requester_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    timeslot_id = Column(Integer, ForeignKey("timeslots.id"))
    status = Column(String, default="pending")
    
    event = relationship("Event", back_populates="meetings")
    requester = relationship("User", foreign_keys=[requester_id], back_populates="meetings_requested")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="meetings_received")
    location = relationship("Location", back_populates="meetings")
    timeslot = relationship("TimeSlot", back_populates="meetings")
    messages = relationship("Message", back_populates="meeting", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"))
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="messages")
    sender = relationship("User")
