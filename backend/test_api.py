# End-to-end API tests. Run: ./venv/bin/python test_api.py
import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ.pop("SMTP_USER", None)
os.environ.pop("POSTMARK_SERVER_TOKEN", None)

from fastapi.testclient import TestClient
import main

client = TestClient(main.app)
passed, failed = 0, 0

def check(name, cond, info=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        print(f"  ✗ {name} {info}")

print("== Event creation ==")
r = client.post("/events/", json={
    "title": "Test Conference", "description": "desc", "host_email": "host@example.com",
    "start_date": "2030-01-10T00:00:00", "end_date": "2030-01-10T23:59:59",
})
check("create event", r.status_code == 200, r.text)
event = r.json()
ac, admin = event["access_code"], event["admin_code"]
check("admin_code returned on creation", bool(admin))

r = client.get(f"/events/{ac}")
check("public event fetch ok", r.status_code == 200)
check("admin_code NOT exposed publicly", "admin_code" not in r.json())
check("host_email NOT exposed publicly", "host_email" not in r.json())

print("== Locations / timeslots require admin ==")
r = client.post(f"/events/{ac}/locations/", json={"name": "Hall A", "capacity": 2})
check("create location w/o auth rejected", r.status_code == 403, r.text)
r = client.post(f"/events/{ac}/locations/", json={"name": "Hall A", "capacity": 2}, headers={"Authorization": admin})
check("create location with admin ok", r.status_code == 200, r.text)
loc = r.json()
r = client.post(f"/events/{ac}/timeslots/", json={"start_time": "2030-01-10T10:00:00", "end_time": "2030-01-10T10:15:00"}, headers={"Authorization": admin})
check("create timeslot 1 with admin ok", r.status_code == 200, r.text)
slot1 = r.json()
r = client.post(f"/events/{ac}/timeslots/", json={"start_time": "2030-01-10T10:15:00", "end_time": "2030-01-10T10:30:00"}, headers={"Authorization": admin})
slot2 = r.json()
r = client.delete(f"/events/{ac}/timeslots/{slot2['id']}")
check("delete timeslot w/o auth rejected", r.status_code == 403, r.text)
r = client.post(f"/events/{ac}/timeslots/", json={"start_time": "2030-01-10T10:15:00", "end_time": "2030-01-10T10:30:00"}, headers={"Authorization": admin})

print("== Attendee signup ==")
def signup(name, email):
    r = client.post(f"/events/{ac}/users/", json={
        "name": name, "email": email, "bio": "bio", "company": "ACME",
        "available_timeslot_ids": [slot1["id"], slot2["id"]],
    })
    assert r.status_code == 200, r.text
    return r.json()

alice = signup("Alice", "alice@example.com")
bob = signup("Bob", "bob@example.com")
carol = signup("Carol", "carol@example.com")
check("signup returns session token", bool(alice["session_token"]))
r = client.post(f"/events/{ac}/users/", json={"name": "Alice", "email": "alice@example.com", "bio": "x"})
check("duplicate email rejected", r.status_code == 400)

r = client.get("/users/", headers={"Authorization": alice["session_token"]})
check("directory ok", r.status_code == 200)
u0 = r.json()[0]
check("directory does NOT expose emails", "email" not in u0, str(u0.keys()))
check("directory does NOT expose tokens/reports", "session_token" not in u0 and "report_comment" not in u0)
r = client.get("/users/")
check("directory w/o token rejected", r.status_code == 401)

print("== URL scheme validation ==")
r = client.post(f"/events/{ac}/users/", json={"name": "Mallory", "email": "mal@example.com", "bio": "x", "profile_link": "javascript:alert(1)"})
check("javascript: profile_link rejected", r.status_code == 422, r.text)
r = client.put(f"/users/{alice['id']}", json={"profile_link": "javascript:alert(1)"}, headers={"Authorization": alice["session_token"]})
check("javascript: profile_link rejected on update", r.status_code == 422, r.text)
r = client.put(f"/users/{alice['id']}", json={"profile_link": "https://example.com/me"}, headers={"Authorization": alice["session_token"]})
check("https profile_link accepted", r.status_code == 200, r.text)
r = client.put(f"/users/{alice['id']}", json={"profile_link": "https://example.com/me"}, headers={"Authorization": alice["session_token"]})
r = client.put(f"/users/{alice['id']}", json={"profile_link": ""}, headers={"Authorization": alice["session_token"]})
check("explicit blank profile_link clears it", r.status_code == 200 and r.json()["profile_link"] is None, r.text)
r = client.put(f"/users/{alice['id']}", json={"profile_link": "https://example.com/me"}, headers={"Authorization": alice["session_token"]})
r = client.put(f"/users/{alice['id']}", json={"company": "NewCo"}, headers={"Authorization": alice["session_token"]})
check("omitting profile_link leaves it unchanged", r.json()["profile_link"] == "https://example.com/me", r.text)

print("== Email normalization at signup ==")
signup("Upper", "upper@example.com")
r = client.post(f"/events/{ac}/users/", json={"name": "Upper2", "email": "UPPER@Example.COM", "bio": "x"})
check("mixed-case duplicate email rejected", r.status_code == 400, r.text)

print("== Meetings ==")
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": bob["id"], "location_id": loc["id"], "timeslot_id": slot1["id"]})
check("meeting w/o token rejected", r.status_code == 401, r.text)
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": bob["id"], "location_id": loc["id"], "timeslot_id": slot1["id"], "request_message": "hi"},
                headers={"Authorization": alice["session_token"]})
check("meeting request ok", r.status_code == 200, r.text)
mtg = r.json()
check("requester derived from token", mtg["requester_id"] == alice["id"])
check("meeting embeds public user (no email)", "email" not in mtg["requester"])

r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": alice["id"], "location_id": loc["id"], "timeslot_id": slot1["id"]},
                headers={"Authorization": alice["session_token"]})
check("self-meeting rejected", r.status_code == 400, r.text)
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": bob["id"], "location_id": loc["id"], "timeslot_id": 99999},
                headers={"Authorization": carol["session_token"]})
check("foreign timeslot rejected", r.status_code == 404, r.text)

# Availability enforcement: dan is available for NO slots
dan = client.post(f"/events/{ac}/users/", json={"name": "Dan", "email": "dan@example.com", "bio": "x", "available_timeslot_ids": []}).json()
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": bob["id"], "location_id": loc["id"], "timeslot_id": slot1["id"]},
                headers={"Authorization": dan["session_token"]})
check("requester not available for slot rejected", r.status_code == 400 and "not available" in r.json()["detail"].lower(), r.text)
# carol is available; target dan who is not
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": dan["id"], "location_id": loc["id"], "timeslot_id": slot1["id"]},
                headers={"Authorization": carol["session_token"]})
check("receiver not available for slot rejected", r.status_code == 400 and "not available" in r.json()["detail"].lower(), r.text)

r = client.get(f"/users/{alice['id']}/meetings/")
check("meetings list w/o token rejected", r.status_code == 401)
r = client.get(f"/users/{alice['id']}/meetings/", headers={"Authorization": bob["session_token"]})
check("other user's meetings forbidden", r.status_code == 403)
r = client.get(f"/users/{alice['id']}/meetings/", headers={"Authorization": alice["session_token"]})
check("own meetings ok", r.status_code == 200 and len(r.json()) == 1)

print("== Meeting status transitions ==")
r = client.put(f"/meetings/{mtg['id']}/status?status=accepted")
check("status change w/o token rejected", r.status_code == 401)
r = client.put(f"/meetings/{mtg['id']}/status?status=accepted", headers={"Authorization": alice["session_token"]})
check("requester cannot accept own request", r.status_code == 403, r.text)
r = client.put(f"/meetings/{mtg['id']}/status?status=accepted", headers={"Authorization": carol["session_token"]})
check("non-participant cannot accept", r.status_code == 403, r.text)
r = client.put(f"/meetings/{mtg['id']}/status?status=accepted", headers={"Authorization": bob["session_token"]})
check("receiver accepts ok", r.status_code == 200, r.text)
check("table number assigned", r.json()["table_number"] == 1)
r = client.put(f"/meetings/{mtg['id']}/status?status=declined", headers={"Authorization": bob["session_token"]})
check("cannot decline an accepted meeting", r.status_code == 400, r.text)

# conflict: carol requests bob same slot, bob already booked
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": bob["id"], "location_id": loc["id"], "timeslot_id": slot1["id"]},
                headers={"Authorization": carol["session_token"]})
check("booked receiver conflict rejected", r.status_code == 400, r.text)

# decline flow on slot2
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": carol["id"], "location_id": loc["id"], "timeslot_id": slot2["id"]},
                headers={"Authorization": bob["session_token"]})
mtg2 = r.json()
r = client.put(f"/meetings/{mtg2['id']}/status?status=declined", headers={"Authorization": carol["session_token"]}, json={"reason": "busy"})
check("receiver declines ok", r.status_code == 200, r.text)

# cancel flow
r = client.put(f"/meetings/{mtg['id']}/status?status=cancelled", headers={"Authorization": alice["session_token"]})
check("participant cancels accepted meeting", r.status_code == 200, r.text)

print("== Calendar ==")
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": bob["id"], "location_id": loc["id"], "timeslot_id": slot1["id"]},
                headers={"Authorization": alice["session_token"]})
mtg3 = r.json()
client.put(f"/meetings/{mtg3['id']}/status?status=accepted", headers={"Authorization": bob["session_token"]})
r = client.get(f"/meetings/{mtg3['id']}/calendar")
check("calendar w/o token rejected", r.status_code == 403)
r = client.get(f"/meetings/{mtg3['id']}/calendar?token={alice['session_token']}")
check("calendar with participant token ok", r.status_code == 200 and "BEGIN:VCALENDAR" in r.text)
r = client.get(f"/meetings/{mtg3['id']}/calendar?token={carol['session_token']}")
check("calendar with stranger token rejected", r.status_code == 403)

print("== Messages ==")
r = client.post(f"/meetings/{mtg3['id']}/messages", json={"content": "hello"}, headers={"Authorization": alice["session_token"]})
check("send message ok", r.status_code == 200, r.text)
r = client.get(f"/meetings/{mtg3['id']}/messages", headers={"Authorization": carol["session_token"]})
check("non-participant cannot read messages", r.status_code == 403)
r = client.get(f"/meetings/{mtg3['id']}/messages", headers={"Authorization": bob["session_token"]})
check("participant reads messages", r.status_code == 200 and len(r.json()) == 1)
check("message sender has no email", "email" not in r.json()[0]["sender"])

print("== Delete protection (active meetings) ==")
# mtg3 is accepted on slot1 in loc — deleting either should be blocked
r = client.delete(f"/events/{ac}/timeslots/{slot1['id']}", headers={"Authorization": admin})
check("cannot delete timeslot with active meeting", r.status_code == 400, r.text)
r = client.delete(f"/events/{ac}/locations/{loc['id']}", headers={"Authorization": admin})
check("cannot delete location with active meeting", r.status_code == 400, r.text)
# meetings list still validates (no dangling slot)
r = client.get(f"/users/{alice['id']}/meetings/", headers={"Authorization": alice["session_token"]})
check("meetings list still serializes", r.status_code == 200, r.text)

print("== Stats ==")
r = client.get(f"/events/{ac}/stats")
check("stats w/o admin rejected", r.status_code == 403)
r = client.get(f"/events/{ac}/stats", headers={"Authorization": admin})
check("stats ok", r.status_code == 200, r.text)
s = r.json()
check("totals correct", s["totals"] == {"pending": 0, "accepted": 1, "declined": 1, "cancelled": 1, "total": 3}, s["totals"])
check("attendee counts", s["attendees"]["total"] == 5 and s["attendees"]["confirmed"] == 5, s["attendees"])
check("per-slot breakdown present", len(s["by_slot"]) == 3)  # slot2 was created twice (the unauthorized delete was rejected)
slot1_stats = next(x for x in s["by_slot"] if x["timeslot_id"] == slot1["id"])
check("slot1 counts", slot1_stats["accepted"] == 1 and slot1_stats["cancelled"] == 1, slot1_stats)
check("tables per slot", s["tables_per_slot"] == 2)

print("== Host endpoints ==")
r = client.get(f"/events/{ac}/attendees/", headers={"Authorization": admin})
check("host attendee list includes emails", r.status_code == 200 and "email" in r.json()[0])

r = client.post(f"/users/{bob['id']}/report", json={"comment": "spam"}, headers={"Authorization": alice["session_token"]})
check("report user ok", r.status_code == 200, r.text)

r = client.put(f"/events/{ac}/users/{bob['id']}/suspend", json={"message": "be nice"}, headers={"Authorization": admin})
check("suspend ok", r.status_code == 200, r.text)
r = client.get(f"/users/{alice['id']}/meetings/", headers={"Authorization": alice["session_token"]})
active = [m for m in r.json() if m["status"] in ("pending", "accepted")]
check("suspension cancelled bob's meetings", len(active) == 0, r.json())
r = client.post(f"/events/{ac}/meetings/", json={"receiver_id": alice["id"], "location_id": loc["id"], "timeslot_id": slot2["id"]},
                headers={"Authorization": bob["session_token"]})
check("suspended user cannot request meetings", r.status_code == 403)
r = client.put(f"/events/{ac}/users/{bob['id']}/unsuspend", headers={"Authorization": admin})
check("unsuspend ok", r.status_code == 200)

print("== Broadcast ==")
r = client.post(f"/events/{ac}/broadcast", json={"message": "welcome all"}, headers={"Authorization": admin})
check("broadcast ok", r.status_code == 200 and r.json()["sent"] == 5, r.text)

print("== Bulk import + decline ==")
csv_data = "name,email,company,bio\nDave,dave@example.com,Org,Hi\nEve,eve@example.com,,\n,missing@example.com,,\n"
r = client.post(f"/events/{ac}/users/bulk", files={"file": ("a.csv", csv_data, "text/csv")}, headers={"Authorization": admin})
check("bulk import ok", r.status_code == 200, r.text)
res = r.json()
check("bulk created 2, 1 error", res["created"] == 2 and len(res["errors"]) == 1, res)
r = client.get("/users/", headers={"Authorization": alice["session_token"]})
names = [u["name"] for u in r.json()]
check("pending invitees hidden from directory", "Dave" not in names, names)

# fetch dave's token via host... not exposed; use /users/me with db lookup instead
db = main.SessionLocal()
dave = db.query(main.models.User).filter(main.models.User.email == "dave@example.com").first()
dave_token = dave.session_token
db.close()
r = client.get("/users/me", headers={"Authorization": dave_token})
check("invitee magic link works", r.status_code == 200 and r.json()["is_confirmed"] == False)
print("== Invite reminders ==")
r = client.post(f"/events/{ac}/invitations/remind", json={"message": "See you there!"})
check("remind w/o admin rejected", r.status_code == 403)
r = client.post(f"/events/{ac}/invitations/remind", json={"message": "See you there!"}, headers={"Authorization": admin})
check("remind sends only to pending invitees", r.status_code == 200 and r.json()["sent"] == 2, r.text)
r = client.post(f"/events/{ac}/invitations/remind", json={}, headers={"Authorization": admin})
check("remind without message ok", r.status_code == 200 and r.json()["sent"] == 2, r.text)

r = client.delete(f"/invitations/decline?token={dave_token}")
check("decline invitation deletes data", r.status_code == 200, r.text)
r = client.get("/users/me", headers={"Authorization": dave_token})
check("declined invitee gone", r.status_code == 401)
r = client.post(f"/events/{ac}/invitations/remind", json={}, headers={"Authorization": admin})
check("declined invitee no longer reminded", r.status_code == 200 and r.json()["sent"] == 1, r.text)

print("== Resend login link ==")
r = client.post(f"/events/{ac}/resend-link", json={"email": "alice@example.com"})
check("resend for registered email ok", r.status_code == 200, r.text)
known_body = r.json()
r = client.post(f"/events/{ac}/resend-link", json={"email": "ALICE@Example.COM "})
check("resend is case/whitespace insensitive", r.status_code == 200)
r = client.post(f"/events/{ac}/resend-link", json={"email": "nobody@example.com"})
check("resend for unknown email gives identical response (no enumeration)", r.status_code == 200 and r.json() == known_body, r.text)
r = client.post("/events/NOPE1234/resend-link", json={"email": "alice@example.com"})
check("resend for unknown event 404", r.status_code == 404)

print("== Event update/delete auth ==")
r = client.put(f"/events/{ac}", json={"title": "Hacked"})
check("event update w/o admin rejected", r.status_code == 403)
r = client.delete(f"/events/{ac}")
check("event delete w/o admin rejected", r.status_code == 403)
r = client.delete(f"/events/{ac}", headers={"Authorization": admin})
check("event delete with admin ok", r.status_code == 200, r.text)
r = client.get(f"/events/{ac}")
check("event gone", r.status_code == 404)

print(f"\n{passed} passed, {failed} failed")
exit(1 if failed else 0)
