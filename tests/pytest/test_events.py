"""
pytest HTTP tests for the Event Management APIs (User Stories 2.1-2.8):
  POST   /api/events
  GET    /api/events
  GET    /api/events/{id}
  PATCH  /api/events/{id}
  POST   /api/events/{id}/register
  POST   /api/events/{id}/checkin
  GET    /api/events/{id}/participants
  GET    /api/events/conflicts
  POST   /api/events/{id}/approve
  PATCH  /api/events/{id}/lock

Requires a running Sangam app + seeded database:
  npm run db:up && npm run db:push && npm run db:seed && npm run dev
  npm run test:pytest

Requests sent with no session cookie fall back to the hardcoded demo persona
(Coordinator of c6, Admin of c1, isFaculty true, Volunteer-only of c3) — see
helpers.py. This lets tests exercise role-gated endpoints without a real login
for the coordinator/faculty side; a real signup+login is used for the plain
member side (registering/cancelling Count Me In).
"""

from __future__ import annotations

import httpx

from helpers import DEMO_COORDINATOR_CLUB_ID, LOGIN_PATH, SIGNUP_PATH, print_case

EVENTS_PATH = "/api/events"
CONFLICTS_PATH = "/api/events/conflicts"
SEEDED_VOLUNTEER_ONLY_EVENT_ID = "e1"  # club c3 (sarga) — demo persona is Volunteer there, not Coordinator/Admin


def _signup_and_login(client: httpx.Client, identity: dict[str, str]) -> None:
    signup = client.post(SIGNUP_PATH, json=identity)
    assert signup.status_code == 201, signup.text
    login = client.post(LOGIN_PATH, json={"email": identity["email"], "password": identity["password"]})
    assert login.status_code == 200, login.text


def _new_event_payload(**overrides) -> dict:
    payload = {
        "clubId": DEMO_COORDINATOR_CLUB_ID,
        "title": "Pytest Test Event",
        "description": "Created by the automated API test suite.",
        "date": "2026-09-01",
        "time": "18:00",
        "venue": "Pytest Hall",
        "capacity": 10,
    }
    payload.update(overrides)
    return payload


def test_create_event_succeeds_for_coordinator(client: httpx.Client, created_events) -> None:
    payload = _new_event_payload()
    response = client.post(EVENTS_PATH, json=payload)
    body = response.json()

    expected = {"status": 201, "data.event.approval": "pending", "userStory": "2.1"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 201
        assert body["success"] is True
        assert body["data"]["event"]["title"] == payload["title"]
        assert body["data"]["event"]["approval"] == "pending"
        assert body["data"]["event"]["registrationLocked"] is False
        assert body["userStory"] == "2.1"
        created_events(body["data"]["event"]["id"])
        print_case("POST /api/events — coordinator creates event", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/events — coordinator creates event", payload, expected, actual, "Fail")
        raise


def test_create_event_forbidden_for_non_coordinator_club(client: httpx.Client) -> None:
    payload = _new_event_payload(clubId="c8")
    response = client.post(EVENTS_PATH, json=payload)
    body = response.json()

    expected = {"status": 403, "error.code": "FORBIDDEN"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 403
        assert body["error"]["code"] == "FORBIDDEN"
        print_case("POST /api/events — not a coordinator of target club", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/events — not a coordinator of target club", payload, expected, actual, "Fail")
        raise


def test_create_event_validation_error_missing_title(client: httpx.Client) -> None:
    payload = _new_event_payload()
    del payload["title"]
    response = client.post(EVENTS_PATH, json=payload)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "VALIDATION_ERROR"
        print_case("POST /api/events — missing title", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/events — missing title", payload, expected, actual, "Fail")
        raise


def test_list_events_filters_by_club(client: httpx.Client, created_events) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Filter Event"))
    assert created.status_code == 201, created.text
    created_events(created.json()["data"]["event"]["id"])

    response = client.get(EVENTS_PATH, params={"clubId": DEMO_COORDINATOR_CLUB_ID})
    body = response.json()

    expected = {"status": 200, "userStory": "2.5"}
    actual = {"status": response.status_code, "count": len(body.get("data", {}).get("events", []))}
    try:
        assert response.status_code == 200
        events = body["data"]["events"]
        assert isinstance(events, list) and len(events) > 0
        assert all(e["clubId"] == DEMO_COORDINATOR_CLUB_ID for e in events)
        assert body["userStory"] == "2.5"
        print_case(f"GET /api/events?clubId={DEMO_COORDINATOR_CLUB_ID}", {}, expected, actual, "Success")
    except AssertionError:
        print_case(f"GET /api/events?clubId={DEMO_COORDINATOR_CLUB_ID}", {}, expected, actual, "Fail")
        raise


def test_get_event_detail_succeeds(client: httpx.Client, created_events) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Detail Event"))
    assert created.status_code == 201, created.text
    event_id = created.json()["data"]["event"]["id"]
    created_events(event_id)

    response = client.get(f"{EVENTS_PATH}/{event_id}")
    body = response.json()

    expected = {"status": 200, "data.event.id": event_id}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["event"]["id"] == event_id
        print_case(f"GET /api/events/{event_id}", {}, expected, actual, "Success")
    except AssertionError:
        print_case(f"GET /api/events/{event_id}", {}, expected, actual, "Fail")
        raise


def test_get_event_detail_404_for_unknown_event(client: httpx.Client) -> None:
    response = client.get(f"{EVENTS_PATH}/does-not-exist")
    body = response.json()

    expected = {"status": 404, "error.code": "EVENT_NOT_FOUND"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 404
        assert body["error"]["code"] == "EVENT_NOT_FOUND"
        print_case("GET /api/events/does-not-exist", {}, expected, actual, "Success")
    except AssertionError:
        print_case("GET /api/events/does-not-exist", {}, expected, actual, "Fail")
        raise


def test_update_event_succeeds_for_coordinator(client: httpx.Client, created_events) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Update Before"))
    assert created.status_code == 201, created.text
    event_id = created.json()["data"]["event"]["id"]
    created_events(event_id)

    payload = {"title": "Pytest Update After"}
    response = client.patch(f"{EVENTS_PATH}/{event_id}", json=payload)
    body = response.json()

    expected = {"status": 200, "data.event.title": "Pytest Update After", "userStory": "2.2"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["event"]["title"] == "Pytest Update After"
        assert body["userStory"] == "2.2"
        print_case(f"PATCH /api/events/{event_id} — coordinator edits title", payload, expected, actual, "Success")
    except AssertionError:
        print_case(f"PATCH /api/events/{event_id} — coordinator edits title", payload, expected, actual, "Fail")
        raise


def test_update_event_forbidden_for_non_coordinator_club(client: httpx.Client) -> None:
    payload = {"title": "Should not be applied"}
    response = client.patch(f"{EVENTS_PATH}/{SEEDED_VOLUNTEER_ONLY_EVENT_ID}", json=payload)
    body = response.json()

    expected = {"status": 403, "error.code": "FORBIDDEN"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 403
        assert body["error"]["code"] == "FORBIDDEN"
        print_case(f"PATCH /api/events/{SEEDED_VOLUNTEER_ONLY_EVENT_ID} — Volunteer-only, not Coordinator", payload, expected, actual, "Success")
    except AssertionError:
        print_case(f"PATCH /api/events/{SEEDED_VOLUNTEER_ONLY_EVENT_ID} — Volunteer-only, not Coordinator", payload, expected, actual, "Fail")
        raise


def test_register_toggle_registers_then_cancels(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
    created_events,
) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Register Event"))
    assert created.status_code == 201, created.text
    event_id = created.json()["data"]["event"]["id"]
    created_events(event_id)

    _signup_and_login(client, unique_institutional_identity)

    register = client.post(f"{EVENTS_PATH}/{event_id}/register")
    register_body = register.json()
    expected_register = {"status": 200, "data.action": "registered"}
    try:
        assert register.status_code == 200
        assert register_body["data"]["action"] == "registered"
        print_case(f"POST /api/events/{event_id}/register — first call", {}, expected_register, register_body, "Success")
    except AssertionError:
        print_case(f"POST /api/events/{event_id}/register — first call", {}, expected_register, register_body, "Fail")
        raise

    cancel = client.post(f"{EVENTS_PATH}/{event_id}/register")
    cancel_body = cancel.json()
    expected_cancel = {"status": 200, "data.action": "cancelled"}
    try:
        assert cancel.status_code == 200
        assert cancel_body["data"]["action"] == "cancelled"
        print_case(f"POST /api/events/{event_id}/register — second call toggles off", {}, expected_cancel, cancel_body, "Success")
    except AssertionError:
        print_case(f"POST /api/events/{event_id}/register — second call toggles off", {}, expected_cancel, cancel_body, "Fail")
        raise


def test_checkin_marks_attendee_checked_in(
    client: httpx.Client,
    base_url: str,
    unique_institutional_identity: dict[str, str],
    created_events,
) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Checkin Event"))
    assert created.status_code == 201, created.text
    event_id = created.json()["data"]["event"]["id"]
    created_events(event_id)

    with httpx.Client(base_url=base_url, timeout=15.0) as attendee:
        _signup_and_login(attendee, unique_institutional_identity)
        register = attendee.post(f"{EVENTS_PATH}/{event_id}/register")
        assert register.status_code == 200, register.text

    participants = client.get(f"{EVENTS_PATH}/{event_id}/participants")
    assert participants.status_code == 200, participants.text
    rows = participants.json()["data"]["participants"]
    assert len(rows) == 1, rows
    count_me_in_id = rows[0]["id"]

    payload = {"countMeInId": count_me_in_id}
    response = client.post(f"{EVENTS_PATH}/{event_id}/checkin", json=payload)
    body = response.json()

    expected = {"status": 200, "data.countMeIn.checkedIn": True, "userStory": "2.7"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["countMeIn"]["checkedIn"] is True
        assert body["userStory"] == "2.7"
        print_case(f"POST /api/events/{event_id}/checkin", payload, expected, actual, "Success")
    except AssertionError:
        print_case(f"POST /api/events/{event_id}/checkin", payload, expected, actual, "Fail")
        raise


def test_participants_forbidden_for_non_coordinator_club(client: httpx.Client) -> None:
    response = client.get(f"{EVENTS_PATH}/{SEEDED_VOLUNTEER_ONLY_EVENT_ID}/participants")
    body = response.json()

    expected = {"status": 403, "error.code": "FORBIDDEN"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 403
        assert body["error"]["code"] == "FORBIDDEN"
        print_case(f"GET /api/events/{SEEDED_VOLUNTEER_ONLY_EVENT_ID}/participants — Volunteer-only", {}, expected, actual, "Success")
    except AssertionError:
        print_case(f"GET /api/events/{SEEDED_VOLUNTEER_ONLY_EVENT_ID}/participants — Volunteer-only", {}, expected, actual, "Fail")
        raise


def test_conflicts_detects_double_booking(client: httpx.Client, created_events) -> None:
    first = client.post(
        EVENTS_PATH,
        json=_new_event_payload(title="Pytest Conflict A", date="2026-09-15", venue="Shared Hall"),
    )
    assert first.status_code == 201, first.text
    first_id = first.json()["data"]["event"]["id"]
    created_events(first_id)

    second = client.post(
        EVENTS_PATH,
        json=_new_event_payload(title="Pytest Conflict B", date="2026-09-15", venue="Shared Hall"),
    )
    assert second.status_code == 201, second.text
    second_id = second.json()["data"]["event"]["id"]
    created_events(second_id)

    response = client.get(CONFLICTS_PATH, params={"date": "2026-09-15", "venue": "Shared Hall"})
    body = response.json()

    expected = {"status": 200, "data.hasConflict": True, "userStory": "2.4"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["hasConflict"] is True
        conflict_ids = {c["id"] for c in body["data"]["conflicts"]}
        assert {first_id, second_id}.issubset(conflict_ids)
        assert body["userStory"] == "2.4"
        print_case("GET /api/events/conflicts — same date+venue", {"date": "2026-09-15", "venue": "Shared Hall"}, expected, actual, "Success")
    except AssertionError:
        print_case("GET /api/events/conflicts — same date+venue", {"date": "2026-09-15", "venue": "Shared Hall"}, expected, actual, "Fail")
        raise


def test_conflicts_requires_date_and_venue(client: httpx.Client) -> None:
    response = client.get(CONFLICTS_PATH)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "VALIDATION_ERROR"
        print_case("GET /api/events/conflicts — missing query params", {}, expected, actual, "Success")
    except AssertionError:
        print_case("GET /api/events/conflicts — missing query params", {}, expected, actual, "Fail")
        raise


def test_approve_event_by_faculty(client: httpx.Client, created_events) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Approve Event"))
    assert created.status_code == 201, created.text
    event_id = created.json()["data"]["event"]["id"]
    created_events(event_id)

    payload = {"approval": "approved"}
    response = client.post(f"{EVENTS_PATH}/{event_id}/approve", json=payload)
    body = response.json()

    expected = {"status": 200, "data.event.approval": "approved", "userStory": "2.8"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["event"]["approval"] == "approved"
        assert body["userStory"] == "2.8"
        print_case(f"POST /api/events/{event_id}/approve — faculty approves", payload, expected, actual, "Success")
    except AssertionError:
        print_case(f"POST /api/events/{event_id}/approve — faculty approves", payload, expected, actual, "Fail")
        raise


def test_approve_event_forbidden_for_non_faculty(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
    created_events,
) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Non-Faculty Approve"))
    assert created.status_code == 201, created.text
    event_id = created.json()["data"]["event"]["id"]
    created_events(event_id)

    _signup_and_login(client, unique_institutional_identity)  # fresh user, isFaculty false
    payload = {"approval": "approved"}
    response = client.post(f"{EVENTS_PATH}/{event_id}/approve", json=payload)
    body = response.json()

    expected = {"status": 403, "error.code": "FORBIDDEN", "message": "Faculty only."}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 403
        assert body["error"]["code"] == "FORBIDDEN"
        assert body["error"]["message"] == "Faculty only."
        print_case(f"POST /api/events/{event_id}/approve — non-faculty user", payload, expected, actual, "Success")
    except AssertionError:
        print_case(f"POST /api/events/{event_id}/approve — non-faculty user", payload, expected, actual, "Fail")
        raise


def test_lock_registration_blocks_new_register(
    client: httpx.Client,
    base_url: str,
    unique_institutional_identity: dict[str, str],
    created_events,
) -> None:
    created = client.post(EVENTS_PATH, json=_new_event_payload(title="Pytest Lock Event"))
    assert created.status_code == 201, created.text
    event_id = created.json()["data"]["event"]["id"]
    created_events(event_id)

    lock_response = client.patch(f"{EVENTS_PATH}/{event_id}/lock", json={"locked": True})
    lock_body = lock_response.json()
    expected_lock = {"status": 200, "data.event.registrationLocked": True, "userStory": "2.6"}
    try:
        assert lock_response.status_code == 200
        assert lock_body["data"]["event"]["registrationLocked"] is True
        assert lock_body["userStory"] == "2.6"
        print_case(f"PATCH /api/events/{event_id}/lock — locks registration", {"locked": True}, expected_lock, lock_body, "Success")
    except AssertionError:
        print_case(f"PATCH /api/events/{event_id}/lock — locks registration", {"locked": True}, expected_lock, lock_body, "Fail")
        raise

    with httpx.Client(base_url=base_url, timeout=15.0) as attendee:
        _signup_and_login(attendee, unique_institutional_identity)
        register = attendee.post(f"{EVENTS_PATH}/{event_id}/register")
        register_body = register.json()

    expected_register = {"status": 409, "error.code": "REGISTRATION_LOCKED"}
    try:
        assert register.status_code == 409
        assert register_body["error"]["code"] == "REGISTRATION_LOCKED"
        print_case(f"POST /api/events/{event_id}/register — blocked while locked", {}, expected_register, register_body, "Success")
    except AssertionError:
        print_case(f"POST /api/events/{event_id}/register — blocked while locked", {}, expected_register, register_body, "Fail")
        raise


def test_lock_forbidden_for_non_coordinator_club(client: httpx.Client) -> None:
    response = client.patch(f"{EVENTS_PATH}/{SEEDED_VOLUNTEER_ONLY_EVENT_ID}/lock", json={"locked": True})
    body = response.json()

    expected = {"status": 403, "error.code": "FORBIDDEN"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 403
        assert body["error"]["code"] == "FORBIDDEN"
        print_case(f"PATCH /api/events/{SEEDED_VOLUNTEER_ONLY_EVENT_ID}/lock — Volunteer-only", {"locked": True}, expected, actual, "Success")
    except AssertionError:
        print_case(f"PATCH /api/events/{SEEDED_VOLUNTEER_ONLY_EVENT_ID}/lock — Volunteer-only", {"locked": True}, expected, actual, "Fail")
        raise
