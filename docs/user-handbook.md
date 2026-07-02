# MeetingMatches — User Handbook

MeetingMatches ([meetingmatches.com](https://meetingmatches.com)) lets event organizers offer structured 1-on-1 meetings to their attendees. Attendees browse a directory of fellow participants, request short meetings in pre-defined time slots, and get a table assignment when the other person accepts. No accounts or passwords — everything works through email links.

This handbook has two parts: one for **event hosts** and one for **attendees**.

---

## Part 1 — For Event Hosts

### 1.1 Creating an event

1. Go to the landing page and choose **Host an event**.
2. Fill in the event title, description, and your email address.
3. After creating the event you are taken to your **host dashboard**, and a welcome email with your **admin link** is sent to you.

> **Keep your admin link private.** Anyone who has it can manage your event — edit it, email all attendees, suspend people, or delete the event entirely. Bookmark it and use *Copy My Admin Link* on the dashboard if you need to move it to another device. Each email address can host up to 3 events at a time.

### 1.2 Setting up meeting areas

Meeting areas are the physical places where 1-on-1s happen — e.g. "Networking Lounge" or "Hall B tables".

- Add each area under **Meeting Areas** with the number of **tables** it holds.
- The number of tables determines how many meetings can run *simultaneously* in that area during one time slot. When a meeting is accepted, the system automatically assigns a free table number and tells both attendees.

### 1.3 Setting up time slots

Time slots are the bookable meeting windows (e.g. 15-minute blocks).

- Under **Time Slots**, pick a start time, an end time, and a meeting duration. The system generates back-to-back slots that fill the window (a 13:00–14:00 window with 15-minute meetings produces 4 slots).
- Slots must lie within the event's start/end dates.
- You can delete individual slots at any time. Removing a slot does not cancel meetings already booked into it, so do this before attendees start booking.

> ⚠️ Attendees cannot request meetings until **both** at least one meeting area and at least one time slot exist. The dashboard shows an amber warning while either is missing.

### 1.4 Inviting attendees

Two ways, which you can combine:

- **Self sign-up:** Share the attendee link (*Copy Attendee Link*) or the downloadable **QR code** — print it on badges, slides, or posters. Attendees register themselves.
- **Bulk import:** Upload a CSV under **Attendees → Bulk Import** with columns `name, email, company, bio` (`company` and `bio` optional). Each person receives an invitation email with:
  - a **confirm link** — opens a pre-filled profile form; the person reviews it, picks their availability, and joins;
  - a **decline link** — immediately and permanently deletes their imported data (GDPR-friendly).

  Imported people stay invisible to other attendees ("Pending") until they confirm. You must tick the consent checkbox confirming you have a lawful basis for uploading their data.

- **Reminders:** While invitations are still pending, the Bulk Import box shows how many people haven't responded and a **Send a reminder** option. It emails everyone who hasn't confirmed or declined yet, with the same confirm and decline links as the original invitation, plus an optional personal message from you. You can send it as often as you like — only still-pending invitees receive it.

### 1.5 Following your event: the statistics panel

The **Meeting Statistics** panel on the host dashboard shows, refreshed every 30 seconds (or on demand with *Refresh*):

- **Totals** — meeting requests by status: pending, accepted, declined, cancelled.
- **Attendee summary** — total attendees, how many are confirmed, how many bulk invitees haven't confirmed yet, how many are suspended.
- **Breakdown by time slot** — for each slot: pending/accepted/declined/cancelled counts and **tables used** (accepted meetings vs. total tables across all areas). Use this to spot slots that are filling up — if a popular slot is near capacity, add another meeting area or more tables.

### 1.6 Broadcast messages

**Send Broadcast** emails a message to every active, confirmed attendee (suspended attendees and unconfirmed invitees are skipped). Use it for schedule changes, room changes, or a "meeting scheduling is now open!" announcement. A confirmation step shows the message before anything is sent.

### 1.7 Moderation: reports and suspensions

- Attendees can **report** another attendee, optionally with a comment. Reported attendees show a red **Reported** badge (with the comment) in your attendee list. Reports are only visible to you, never to attendees.
- **Suspend** an attendee to immediately:
  - cancel all of their pending and accepted meetings (the other parties are emailed),
  - hide them from the directory,
  - block them from requesting meetings, accepting, or chatting,
  - show them a suspension notice instead of the dashboard.

  You can attach an optional message that is included in the suspension email. Suspension is reversible — use **Reinstate** to restore access (previously cancelled meetings stay cancelled).
- **Remove** deletes an attendee and their meetings permanently; the person is notified by email.

### 1.8 Editing and deleting the event

- **Edit Event** lets you change the title, description, dates, venue, website link, logo, and header banner image.
- **Delete Event** (Danger Zone) permanently removes the event with all attendees, meetings, and messages. This cannot be undone.

### 1.9 Data lifecycle (important)

Events are **automatically deleted 24 hours after the last time slot ends**, including all attendee profiles, meetings, and chat messages. This is a privacy feature — attendee data does not linger. Export anything you need (e.g. your attendee list) before that window closes.

---

## Part 2 — For Attendees

### 2.1 Joining an event

Open the event link or scan the QR code provided by the organizer, then fill in:

- your **name**, **email**, and a short **bio** (this is what others see when deciding to meet you),
- optionally your **company** and a **profile link** (LinkedIn, personal site, …),
- your **availability** — tick the time slots when you're free for meetings,
- the privacy consent checkbox.

After joining you receive an email with your **personal login link** (magic link). There is no password: that link *is* your login. The dashboard also has a *My Login Link* button to copy it — useful for opening your account on your phone. Don't share it; anyone with the link can act as you.

If you lose the link, use **"Lost your login link? Resend it"** on the event's join page to get a new email. (If you try to sign up again with the same email, the same option is offered automatically.)

If you were invited by the organizer, your invitation email contains a **confirm** link (review your pre-filled profile and join) and a **decline** link (permanently deletes your data).

### 2.2 Finding people

The **Attendee Directory** shows everyone at the event. You can:

- **search** by name or bio text,
- click a card to see someone's **full profile**,
- mark people as **favourites** (♥) and filter to favourites only — handy at large events for building a shortlist of who you want to meet. Favourites are private to you and stored only in your browser.

Other attendees see your name, company, bio, photo, and profile link — **never your email address**.

### 2.3 Requesting a meeting

1. Click **Request Meeting** on someone's card or profile.
2. Choose a **meeting area** and a **time slot**. Only slots where *both* of you have marked availability are offered — if there's no overlap, you'll see a note saying so.
3. Optionally add a short message saying why you'd like to meet.
4. Send. The other person gets an email and decides.

You can only have one meeting (pending or accepted) per time slot.

### 2.4 Responding to requests

Incoming requests appear at the top of **My Meetings** and arrive by email too.

- **Accept** — the meeting is confirmed and a **table number** in the chosen area is automatically assigned. Both of you are notified.
- **Decline** — optionally give a reason, which is included in the notification email to the requester.

Once a meeting is accepted you can:

- **Chat** with the other person inside the app (e.g. "running 5 minutes late"),
- **Add to calendar** — downloads an `.ics` file for your calendar app,
- **Cancel** if your plans change; the other person is notified by email.

### 2.5 Managing your availability

Use the **Edit Availability** box (or Edit Profile) to change which slots you're free in at any time. Availability only affects *new* meeting requests — existing meetings stay booked even if you untick their slot, so cancel those separately if you're truly unavailable.

### 2.6 During and after the event

- Your accepted meetings show the **area, table number, and time** — just show up.
- After a meeting's time slot has passed, the person appears in **People I've Met** — a recap list with their profile and contact links so you can follow up.

### 2.7 Safety and privacy

- **Report** lets you flag inappropriate behaviour to the organizer, with a comment. The reported person is not told who reported them.
- The organizer can suspend attendees who misbehave.
- **Remove My Profile** (in Edit Profile) permanently deletes your profile and all your meetings.
- All event data is automatically deleted within 24 hours after the event's last time slot.

---

## Email notifications reference

| Email | Sent to | When |
|---|---|---|
| Host welcome + admin link | Host | Event created |
| Personal login link | Attendee | After signing up |
| Invitation (confirm/decline) | Attendee | Host bulk-imports them |
| Invitation reminder | Attendee | Host sends a reminder to pending invitees (same confirm/decline links, optional host message) |
| New meeting request | Receiver | Someone requests a meeting |
| Request accepted (with table) | Requester | Receiver accepts |
| Request declined (with reason) | Requester | Receiver declines |
| Meeting cancelled | Both parties | Either cancels, or one party is suspended/removed |
| New chat message | Other participant | A chat message is sent |
| Broadcast | All active attendees | Host sends a broadcast |
| Suspension / reinstatement / removal | Affected attendee | Host moderates |

Every notification contains a login link straight back to your dashboard.

## Troubleshooting

- **"Email already registered for this event"** — you already joined; open your login link from the original signup email instead.
- **Lost your login link?** On the event's join page, click **"Lost your login link? Resend it"**, enter the email you registered with, and a fresh link is emailed to you.
- **No time slots offered when requesting a meeting** — you and the other person have no overlapping availability; add more slots in Edit Availability.
- **"The location is already full at this time"** — all tables in that area are taken for that slot; pick another area or slot.
- **Event link says "Event Not Found"** — the event may have ended (events are deleted 24h after the last slot) or the code is mistyped.
