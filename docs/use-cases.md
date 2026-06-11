# MeetingMatches — Use Cases

MeetingMatches fits any event where attendees benefit from short, scheduled 1-on-1 conversations. The core model: a directory of profiles, fixed time slots, meeting areas with a known number of tables, request → accept → table assignment, and automatic data deletion after the event.

Below are the scenarios it serves best, with concrete setup recipes.

---

## 1. Conference & summit networking

**Scenario.** A 200–500 person industry conference wants attendees to do business networking between talks instead of milling around the coffee table.

**Setup recipe.**
- Meeting areas: "Networking Lounge" with 20 tables, "Expo Hall corner" with 10.
- Time slots: 15-minute blocks during coffee breaks and lunch (e.g. 10:30–11:00, 12:30–14:00).
- Print the QR code on badges and the program booklet; show it on screen between talks.
- Send a broadcast when scheduling opens: "Meeting scheduling is live — pick your slots!"

**Why it works.** Attendees self-select via bios and company names; the table assignment removes the "where do we meet?" friction; the stats panel tells organizers which breaks need more tables.

## 2. B2B matchmaking / trade fairs

**Scenario.** A trade fair wants buyers and suppliers to book meetings ahead of the day, classic "hosted buyer" style.

**Setup recipe.**
- Bulk-import the curated buyer and supplier lists as CSV (name, email, company, bio describing what they offer/seek). Each person confirms their own profile — no manual account setup.
- Meeting areas per hall zone, tables matching the physical matchmaking tables.
- Longer slots (20–30 min) across the whole fair day.
- Use the request message ("We supply X and saw you're sourcing Y") to pre-qualify meetings; receivers decline with a reason when there's no fit.

**Why it works.** The bulk-invite flow respects GDPR (decline link deletes data immediately), the per-slot statistics show utilization per matchmaking session, and declined-with-reason keeps the tone professional.

## 3. University career fairs and research showcases

**Scenario.** A university department runs a career fair or research open day; students want face time with employers or research groups.

**Setup recipe.**
- Employers/research groups join as attendees with rich bios ("We're hiring ML interns"); students browse and request meetings.
- Areas: one per company stand, capacity = number of chairs at the stand.
- Short slots (10 min) to maximize throughput; students favourite (♥) target companies first, then request.
- Department coordinator monitors the stats panel to see which stands are overbooked and announces free capacity via broadcast.

**Why it works.** Self-serve hosting bypasses slow university procurement; large events naturally exercise the directory search, favourites, and pagination.

## 4. Speed dating and singles events

**Scenario.** A matchmaking evening, an interest-based dating night, or an LGBTQ+ social with structured 1-on-1 rounds.

**Setup recipe.**
- Time slots = the rounds (e.g. 8 × 10-minute rounds with 5-minute breaks).
- One area ("Café floor") with as many tables as couples that can sit simultaneously.
- Attendees upload a photo, write a short bio, and request meetings with people they find interesting; a meeting happens only if the other person **accepts** — nobody is forced into a conversation.
- After the event, "People I've Met" gives everyone a recap of who they actually talked to; profile links are optional for privacy.
- Everything is auto-deleted 24 hours after the last round — a genuine selling point for this audience.

**Note.** A dedicated "mutual match" mode (both must independently express interest before any contact) is on the roadmap; today the accept/decline flow plays that role.

## 5. Investor–founder speed pitching

**Scenario.** An accelerator demo day or pitch night where founders book short pitches with investors.

**Setup recipe.**
- Bulk-import investors (bio = thesis, stage, ticket size); founders self-register via QR code at the door.
- 10-minute slots during the pitching hour; areas = pitch booths.
- Founders attach their one-liner as the request message; investors accept selectively and decline with a reason ("outside our thesis").
- Organizer watches the stats panel: pending counts per slot show demand; utilization shows whether to open another booth.

## 6. Internal company events & offsites

**Scenario.** A large company all-hands or offsite wants cross-team "coffee chats" — people who never meet otherwise.

**Setup recipe.**
- Bulk-import the staff list from HR (with consent); bios = role + what they can help with.
- Slots during designated networking blocks; areas = café corners.
- Broadcast nudges ("30 minutes left to book your cross-team chats").

## 7. Mentor–mentee matching days

**Scenario.** A professional association runs a mentoring day where juniors book sessions with senior volunteers.

**Setup recipe.**
- Mentors bulk-imported with bios describing expertise; mentees self-register.
- Mentors mark availability only for the hours they volunteer — the overlap rule automatically prevents bad requests.
- 20–30 minute slots; mentors accept as capacity allows, and the one-meeting-per-slot rule prevents double-booking them.

---

## Choosing settings by event size

| Event size | Slot length | Tables guidance | Onboarding |
|---|---|---|---|
| < 50 people | 15–30 min | 5–10 tables in one area | Self sign-up via link |
| 50–200 | 15–20 min | 10–20 tables, 1–2 areas | QR code + optional bulk import |
| 200–500+ | 10–15 min | 20+ tables across multiple areas | Bulk import the known list, QR for walk-ins; watch the stats panel per slot |

## What MeetingMatches deliberately does *not* do

- No attendee accounts or passwords — magic links only.
- No public attendee emails — contact happens in-app until people choose to share.
- No long-term data storage — events self-delete 24 hours after the last slot.
- No algorithmic auto-matching (yet) — humans choose whom to meet; the app removes the logistics friction.
