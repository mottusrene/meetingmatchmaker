from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime

def validate_http_url(v: Optional[str]) -> Optional[str]:
    """Allow only http(s) links. These values are rendered into href attributes,
    so schemes like javascript: must never be stored. Empty values become None."""
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if not (v.lower().startswith("http://") or v.lower().startswith("https://")):
        raise ValueError("Link must start with http:// or https://")
    return v

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

    _v_profile_link = field_validator("profile_link")(validate_http_url)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    profile_link: Optional[str] = None
    avatar_url: Optional[str] = None
    available_timeslot_ids: Optional[List[int]] = None

    _v_profile_link = field_validator("profile_link")(validate_http_url)

class User(UserBase):
    id: int
    event_id: Optional[int] = None
    is_host: bool
    is_flagged: bool = False
    is_suspended: bool = False
    is_confirmed: bool = True
    report_comment: Optional[str] = None
    available_timeslots: List[TimeSlot] = []

    class Config:
        from_attributes = True

# What other attendees may see: no email, no flag/report data, no token
class UserPublic(BaseModel):
    id: int
    name: str
    company: Optional[str] = None
    bio: Optional[str] = None
    profile_link: Optional[str] = None
    avatar_url: Optional[str] = None
    is_host: bool
    is_suspended: bool = False
    is_confirmed: bool = True
    available_timeslots: List[TimeSlot] = []

    class Config:
        from_attributes = True

class UserPrivate(User):
    session_token: Optional[str] = None

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    host_email: str
    host_name: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    host_name: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    _v_website = field_validator("website")(validate_http_url)

class EventCreate(EventBase):
    passcode: Optional[str] = None

    _v_website = field_validator("website")(validate_http_url)

class Event(EventBase):
    id: int
    access_code: str
    admin_code: Optional[str] = None

    class Config:
        from_attributes = True

# What anyone with the public access code may see: no admin_code, no host_email
class EventPublic(BaseModel):
    id: int
    access_code: str
    title: str
    description: Optional[str] = None
    host_name: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

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
    
    sender: UserPublic

    class Config:
        from_attributes = True

class MeetingBase(BaseModel):
    location_id: int
    timeslot_id: int
    receiver_id: int

class MeetingCreate(MeetingBase):
    request_message: Optional[str] = None

class Meeting(MeetingBase):
    id: int
    event_id: int
    requester_id: int
    status: str
    request_message: Optional[str] = None
    table_number: Optional[int] = None
    
    requester: UserPublic
    receiver: UserPublic
    location: Location
    timeslot: TimeSlot

    class Config:
        from_attributes = True
