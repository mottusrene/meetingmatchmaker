from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TimeSlotBase(BaseModel):
    start_time: datetime
    end_time: datetime

class TimeSlotCreate(TimeSlotBase):
    pass

class TimeSlot(TimeSlotBase):
    id: int
    event_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    name: str
    email: str
    company: Optional[str] = None
    bio: Optional[str] = None
    profile_link: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    is_host: bool = False
    available_timeslot_ids: List[int] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    profile_link: Optional[str] = None
    avatar_url: Optional[str] = None
    available_timeslot_ids: Optional[List[int]] = None

class User(UserBase):
    id: int
    event_id: Optional[int] = None
    is_host: bool
    is_flagged: bool = False
    is_suspended: bool = False
    report_comment: Optional[str] = None
    available_timeslots: List[TimeSlot] = []

    class Config:
        from_attributes = True

class UserPrivate(User):
    session_token: Optional[str] = None

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    host_email: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class EventCreate(EventBase):
    passcode: Optional[str] = None

class Event(EventBase):
    id: int
    access_code: str
    admin_code: Optional[str] = None

    class Config:
        from_attributes = True

class LocationBase(BaseModel):
    name: str
    capacity: int = 1

class LocationCreate(LocationBase):
    pass

class Location(LocationBase):
    id: int
    event_id: int

    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    meeting_id: int
    sender_id: int
    timestamp: datetime
    
    sender: User
    
    class Config:
        from_attributes = True

class MeetingBase(BaseModel):
    location_id: int
    timeslot_id: int
    receiver_id: int

class MeetingCreate(MeetingBase):
    pass

class Meeting(MeetingBase):
    id: int
    event_id: int
    requester_id: int
    status: str
    
    requester: User
    receiver: User
    location: Location
    timeslot: TimeSlot

    class Config:
        from_attributes = True
