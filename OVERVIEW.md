# MeetingMatches --- Product Overview

**MeetingMatches** (meetingmatches.com) is a lightweight, self-hosted
web application that enables event organisers to facilitate structured
1-on-1 networking at in-person events. Attendees browse each other's
profiles, request meetings, and manage their schedules --- all without
creating an account or remembering a password.

------------------------------------------------------------------------

## Core Features

### For Hosts

**Event Creation & Management** Hosts create an event in seconds by
providing a title, optional description, location, dates, and their
email address. The system generates a unique attendee access code and a
private admin link that is emailed to the host. The host dashboard
allows editing event details (title, description, logo, banner image,
website) at any time.

**Time Slots & Meeting Areas** Hosts define the meeting schedule by
adding time slots (start time, end time, duration) and physical meeting
areas (e.g. "Main Hall", "Lounge"), each with a configurable number of
simultaneous tables. The system uses these to prevent double-booking: no
attendee can be assigned to two meetings at the same time, and no
location can host more meetings than it has tables.

**Attendee Management** The host dashboard lists all registered
attendees with their name, email, company, and bio. Hosts can search by
name or email. If an attendee behaves inappropriately, the host can
**suspend** them with one click --- this cancels all their pending and
accepted meetings and notifies affected parties by email. Suspended
attendees see a suspension screen and cannot interact with others. They
can be reinstated at any time. Flagged (reported) attendees are
highlighted for the host's attention.

**Bulk Import via CSV** Hosts can upload a CSV file (columns: `name`,
`email`, and optionally `company`, `bio`) to pre-register attendees in
bulk. Each imported person receives a personalised invitation email with
a magic link to confirm their profile and a separate decline link.
Declining permanently deletes their data. This flow is GDPR-compliant:
the host must confirm they have a lawful basis for processing the data
before uploading.

**Broadcast Messaging** Hosts can send a one-time broadcast email to all
active (confirmed, non-suspended) attendees of an event --- useful for
last-minute schedule changes, welcome messages, or reminders.

**QR Code & Sharing** The dashboard provides a copyable attendee
registration link and a downloadable SVG QR code that can be printed or
displayed at the venue for instant self-registration.

**Event Deletion** Hosts can permanently delete an event and all
associated data (attendees, meetings, timeslots, locations) from the
Danger Zone section of the dashboard.

------------------------------------------------------------------------

### For Attendees

**Passwordless Registration & Login** Attendees register by visiting the
event link (or scanning the QR code), filling in their name, email,
company, bio, and optionally a profile/website link. No password is
required. On subsequent visits, a magic link is emailed to them for
secure, one-click login. All session state is stored in browser
localStorage.

**Availability Declaration** During registration (and later via profile
editing), attendees select which time slots they are available for
meetings. The matching system uses these selections to only offer valid,
non-conflicting meeting times.

**Attendee Directory** Attendees can browse a searchable, card-based
directory of all other confirmed, non-suspended participants. Each card
shows the attendee's name, company, avatar (if uploaded), and the first
few lines of their bio. Clicking a card opens a full profile modal with
the complete bio and profile link. A heart icon lets attendees save
favourites, which are stored locally and can be filtered with a
"Favourites" toggle.

**Meeting Requests** From any attendee's profile modal, a user can send
a 1-on-1 meeting request by selecting a mutually available time slot and
a meeting location, with an optional note. The recipient receives an
email notification and can accept or decline from their dashboard.

**My Meetings** The dashboard shows all meeting requests in a clear
priority order: action-required first (pending received requests), then
confirmed upcoming meetings, then outgoing requests awaiting response,
and finally past or declined meetings. Confirmed upcoming meetings
display the table assignment and include a calendar file download
(.ics). A chat button opens a real-time message thread with the other
person.

**People I've Met** Once a confirmed meeting's time slot has passed, it
graduates into a "People I've Met" section --- a persistent record of
connections made at the event. Clicking a name reopens the person's
profile.

**Profile Editing & Self-Removal** Attendees can update their name,
company, bio, profile link, avatar, and availability at any time. They
also have the option to permanently remove their own profile from the
event, which deletes all their data and cancels their meetings.

**Reporting** If an attendee encounters inappropriate behaviour, they
can report another user. The host is notified and the flagged attendee
is highlighted in the host dashboard for review.

------------------------------------------------------------------------

## Key Design Principles

- **No accounts, no passwords.** Magic links keep onboarding friction
  near zero.
- **Privacy by default.** All event data (attendees, meetings, messages)
  is automatically deleted 24 hours after the event's end date.
- **Self-hosted simplicity.** The entire stack runs as a single
  `docker-compose up` command on any Linux server. No external services
  required beyond an SMTP server.
- **Mobile-first UI.** The attendee dashboard and registration form are
  fully responsive and optimised for use on smartphones at live events.

------------------------------------------------------------------------

# Some Primary Use Cases

  -----------------------------------------------------------------------
  Use Case                            Why it fits
  ----------------------------------- -----------------------------------
  **Corporate conferences & summits** Pre-scheduled 1-on-1s between
                                      attendees, investors, or sponsors

  **Career & recruitment fairs**      Candidates request meetings with
                                      company reps during defined slots

  **University topic fairs**          Students browse exhibitor profiles
                                      and book short meetings

  **Speed networking events**         Timed rotation schedule with
                                      location and table control

  **Speed dating / singles nights**   Natural fit for timed 1-on-1
                                      rotation; mutual connection
                                      tracking

  **Trade shows & expos**             Exhibitor-to-visitor meeting
                                      booking with location assignment
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Technical Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, deployed on port
  3000
- **Backend:** FastAPI (Python), SQLite, deployed on port 8000
- **Auth:** Session tokens and magic links (no OAuth, no passwords)
- **Email:** SMTP via environment variables (FROM_EMAIL configurable)
- **Deployment:** Docker Compose; nginx recommended as reverse proxy for
  port 80/443
