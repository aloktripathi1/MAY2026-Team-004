# Test cases — Event Management APIs

User Stories **2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
Plan ref: `docs/Sangam_M3_M4_Plan.md` Event Management APIs
OpenAPI: `docs/openapi.yaml` → `/api/events`, `/api/events/{id}`, `/api/events/{id}/register`, `/api/events/{id}/checkin`, `/api/events/{id}/participants`, `/api/events/conflicts`, `/api/events/{id}/approve`, `/api/events/{id}/lock`

**pytest:** `tests/pytest/test_events.py` — hits the live API over HTTP.

```bash
npm run test:pytest:install
npm run db:up && npm run db:push && npm run db:seed && npm run dev   # separate terminal
npm run test:pytest
```

---

```
API being tested: POST /api/events — coordinator creates event
Inputs:
  {
    "clubId": "c6", "title": "Pytest Test Event", "description": "...",
    "date": "2026-09-01", "time": "18:00", "venue": "Pytest Hall", "capacity": 10
  }
  (no session cookie -> demo persona, Coordinator of c6)
Expected output:
  HTTP 201 { "data": { "event": { "approval": "pending", "registrationLocked": false } }, "userStory": "2.1" }
Actual Output:
  Covered by pytest test_create_event_succeeds_for_coordinator
Result: Success
```

---

```
API being tested: POST /api/events — not a coordinator of target club
Inputs:
  Same payload with "clubId": "c8" (demo persona holds no role in c8)
Expected output:
  HTTP 403 { "error": { "code": "FORBIDDEN" } }
Actual Output:
  Covered by pytest test_create_event_forbidden_for_non_coordinator_club
Result: Success
```

---

```
API being tested: POST /api/events — missing title
Inputs:
  Event payload with "title" omitted
Expected output:
  HTTP 400 { "error": { "code": "VALIDATION_ERROR" } }
Actual Output:
  Covered by pytest test_create_event_validation_error_missing_title
Result: Success
```

---

```
API being tested: GET /api/events?clubId=c6
Inputs:
  clubId=c6 query param, after creating at least one c6 event
Expected output:
  HTTP 200, all returned events have clubId "c6", userStory "2.5"
Actual Output:
  Covered by pytest test_list_events_filters_by_club
Result: Success
```

---

```
API being tested: GET /api/events/{id} — event detail
Inputs:
  GET the id of a freshly created event
Expected output:
  HTTP 200 { "data": { "event": { "id": "<matches>" } } }
Actual Output:
  Covered by pytest test_get_event_detail_succeeds
Result: Success
```

---

```
API being tested: GET /api/events/{id} — unknown event
Inputs:
  GET /api/events/does-not-exist
Expected output:
  HTTP 404 { "error": { "code": "EVENT_NOT_FOUND" } }
Actual Output:
  Covered by pytest test_get_event_detail_404_for_unknown_event
Result: Success
```

---

```
API being tested: PATCH /api/events/{id} — coordinator edits title
Inputs:
  { "title": "Pytest Update After" } against an event the demo Coordinator owns (c6)
Expected output:
  HTTP 200 { "data": { "event": { "title": "Pytest Update After" } }, "userStory": "2.2" }
Actual Output:
  Covered by pytest test_update_event_succeeds_for_coordinator
Result: Success
```

---

```
API being tested: PATCH /api/events/{id} — Volunteer-only club, not Coordinator/Admin
Inputs:
  { "title": "Should not be applied" } against seeded event "e1" (club c3,
  demo persona is only Volunteer there)
Expected output:
  HTTP 403 { "error": { "code": "FORBIDDEN" } }
Actual Output:
  Covered by pytest test_update_event_forbidden_for_non_coordinator_club
Result: Success
```

---

```
API being tested: POST /api/events/{id}/register — first call registers
Inputs:
  POST with no body, authenticated as a fresh signed-up member
Expected output:
  HTTP 200 { "data": { "action": "registered" } }
Actual Output:
  Covered by pytest test_register_toggle_registers_then_cancels
Result: Success
```

---

```
API being tested: POST /api/events/{id}/register — second call cancels
Inputs:
  Same user calling register again immediately after
Expected output:
  HTTP 200 { "data": { "action": "cancelled" } }
Actual Output:
  Covered by pytest test_register_toggle_registers_then_cancels
Result: Success
```

---

```
API being tested: POST /api/events/{id}/checkin — mark attendee checked in
Inputs:
  { "countMeInId": "<from participants list>" } sent by the event's coordinator,
  after a separate member registered for the event
Expected output:
  HTTP 200 { "data": { "countMeIn": { "checkedIn": true } }, "userStory": "2.7" }
Actual Output:
  Covered by pytest test_checkin_marks_attendee_checked_in
Result: Success
```

---

```
API being tested: GET /api/events/{id}/participants — Volunteer-only club, not Coordinator/Admin
Inputs:
  GET participants for seeded event "e1" (club c3, demo persona only Volunteer)
Expected output:
  HTTP 403 { "error": { "code": "FORBIDDEN" } }
Actual Output:
  Covered by pytest test_participants_forbidden_for_non_coordinator_club
Result: Success
```

---

```
API being tested: GET /api/events/conflicts — same date+venue produces a conflict
Inputs:
  Two events created for date=2026-09-15, venue="Shared Hall", then
  GET /api/events/conflicts?date=2026-09-15&venue=Shared+Hall
Expected output:
  HTTP 200 { "data": { "hasConflict": true, "conflicts": [...both event ids...] }, "userStory": "2.4" }
Actual Output:
  Covered by pytest test_conflicts_detects_double_booking
Result: Success
```

---

```
API being tested: GET /api/events/conflicts — missing required query params
Inputs:
  GET /api/events/conflicts (no date, no venue)
Expected output:
  HTTP 400 { "error": { "code": "VALIDATION_ERROR" } }
Actual Output:
  Covered by pytest test_conflicts_requires_date_and_venue
Result: Success
```

---

```
API being tested: POST /api/events/{id}/approve — faculty approves
Inputs:
  { "approval": "approved" } (no session cookie -> demo persona, isFaculty true)
Expected output:
  HTTP 200 { "data": { "event": { "approval": "approved" } }, "userStory": "2.8" }
Actual Output:
  Covered by pytest test_approve_event_by_faculty
Result: Success
```

---

```
API being tested: POST /api/events/{id}/approve — non-faculty user rejected
Inputs:
  { "approval": "approved" } sent by a freshly signed-up member (isFaculty false)
Expected output:
  HTTP 403 { "error": { "code": "FORBIDDEN", "message": "Faculty only." } }
Actual Output:
  Covered by pytest test_approve_event_forbidden_for_non_faculty
Result: Success
```

---

```
API being tested: PATCH /api/events/{id}/lock — locks registration, then register is blocked
Inputs:
  { "locked": true } by the event's coordinator, then a fresh member calling
  POST /api/events/{id}/register
Expected output:
  Lock: HTTP 200 { "data": { "event": { "registrationLocked": true } }, "userStory": "2.6" }
  Register attempt after lock: HTTP 409 { "error": { "code": "REGISTRATION_LOCKED" } }
Actual Output:
  Covered by pytest test_lock_registration_blocks_new_register
Result: Success
```

---

```
API being tested: PATCH /api/events/{id}/lock — Volunteer-only club, not Coordinator/Admin
Inputs:
  { "locked": true } against seeded event "e1" (club c3, demo persona only Volunteer)
Expected output:
  HTTP 403 { "error": { "code": "FORBIDDEN" } }
Actual Output:
  Covered by pytest test_lock_forbidden_for_non_coordinator_club
Result: Success
```
