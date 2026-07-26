"""
pytest HTTP tests for the Membership APIs (User Stories 1.2-1.5, 7.1):
  POST   /api/onboarding/interests
  POST   /api/members/bulk-import
  GET    /api/clubs/{id}/members
  POST   /api/clubs/{id}/members
  PATCH  /api/clubs/{id}/members/{memberId}

Requires a running Sangam app + seeded database:
  npm run db:up && npm run db:push && npm run db:seed && npm run dev
  npm run test:pytest

Requests sent with no session cookie fall back to the hardcoded demo persona
(Admin of c1, Coordinator of c6) — see helpers.py for details. This lets tests
exercise role-gated endpoints without a real login for the privileged side.
"""

from __future__ import annotations

import httpx

from helpers import (
    DEMO_ADMIN_CLUB_ID,
    DEMO_UNRELATED_CLUB_ID,
    LOGIN_PATH,
    SIGNUP_PATH,
    print_case,
)

INTERESTS_PATH = "/api/onboarding/interests"
BULK_IMPORT_PATH = "/api/members/bulk-import"


def _signup_and_login(client: httpx.Client, identity: dict[str, str]) -> None:
    signup = client.post(SIGNUP_PATH, json=identity)
    assert signup.status_code == 201, signup.text
    login = client.post(LOGIN_PATH, json={"email": identity["email"], "password": identity["password"]})
    assert login.status_code == 200, login.text


def test_onboarding_interests_saves_valid_selection(
    client: httpx.Client, unique_institutional_identity: dict[str, str]
) -> None:
    _signup_and_login(client, unique_institutional_identity)
    payload = {"interests": ["Technical", "Design"]}
    response = client.post(INTERESTS_PATH, json=payload)
    body = response.json()

    expected = {"status": 200, "data.interests": payload["interests"], "userStory": "7.1"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["success"] is True
        assert body["data"]["interests"] == payload["interests"]
        assert body["userStory"] == "7.1"
        print_case("POST /api/onboarding/interests — valid selection", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/onboarding/interests — valid selection", payload, expected, actual, "Fail")
        raise


def test_onboarding_interests_rejects_too_many(
    client: httpx.Client, unique_institutional_identity: dict[str, str]
) -> None:
    _signup_and_login(client, unique_institutional_identity)
    payload = {"interests": ["Technical", "Cultural", "Sports", "Design", "Debate", "Writing"]}
    response = client.post(INTERESTS_PATH, json=payload)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "VALIDATION_ERROR"
        print_case("POST /api/onboarding/interests — too many interests", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/onboarding/interests — too many interests", payload, expected, actual, "Fail")
        raise


def test_join_club_creates_pending_membership(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
    created_memberships,
) -> None:
    _signup_and_login(client, unique_institutional_identity)
    response = client.post(f"/api/clubs/{DEMO_UNRELATED_CLUB_ID}/members")
    body = response.json()

    expected = {"status": 201, "data.membership.status": "Pending", "userStory": "1.3"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 201
        assert body["success"] is True
        assert body["data"]["membership"]["status"] == "Pending"
        assert body["data"]["membership"]["clubId"] == DEMO_UNRELATED_CLUB_ID
        assert body["userStory"] == "1.3"
        created_memberships(body["data"]["membership"]["id"])
        print_case(f"POST /api/clubs/{DEMO_UNRELATED_CLUB_ID}/members — new join request", {}, expected, actual, "Success")
    except AssertionError:
        print_case(f"POST /api/clubs/{DEMO_UNRELATED_CLUB_ID}/members — new join request", {}, expected, actual, "Fail")
        raise


def test_join_club_conflicts_when_already_applied(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
    created_memberships,
) -> None:
    _signup_and_login(client, unique_institutional_identity)
    first = client.post(f"/api/clubs/{DEMO_UNRELATED_CLUB_ID}/members")
    assert first.status_code == 201, first.text
    created_memberships(first.json()["data"]["membership"]["id"])

    response = client.post(f"/api/clubs/{DEMO_UNRELATED_CLUB_ID}/members")
    body = response.json()

    expected = {"status": 409, "error.code": "ALREADY_MEMBER"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 409
        assert body["error"]["code"] == "ALREADY_MEMBER"
        print_case(f"POST /api/clubs/{DEMO_UNRELATED_CLUB_ID}/members — duplicate join request", {}, expected, actual, "Success")
    except AssertionError:
        print_case(f"POST /api/clubs/{DEMO_UNRELATED_CLUB_ID}/members — duplicate join request", {}, expected, actual, "Fail")
        raise


def test_join_club_404_for_unknown_club(
    client: httpx.Client, unique_institutional_identity: dict[str, str]
) -> None:
    _signup_and_login(client, unique_institutional_identity)
    response = client.post("/api/clubs/does-not-exist/members")
    body = response.json()

    expected = {"status": 404, "error.code": "CLUB_NOT_FOUND"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 404
        assert body["error"]["code"] == "CLUB_NOT_FOUND"
        print_case("POST /api/clubs/does-not-exist/members — unknown club", {}, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/clubs/does-not-exist/members — unknown club", {}, expected, actual, "Fail")
        raise


def test_list_club_members_succeeds_for_admin(client: httpx.Client) -> None:
    """No login -> falls back to demo persona, which is Admin of DEMO_ADMIN_CLUB_ID."""
    response = client.get(f"/api/clubs/{DEMO_ADMIN_CLUB_ID}/members")
    body = response.json()

    expected = {"status": 200, "userStory": "1.2"}
    actual = {"status": response.status_code, "body_keys": list(body.get("data", {}).keys())}
    try:
        assert response.status_code == 200
        assert body["success"] is True
        assert isinstance(body["data"]["members"], list)
        assert body["userStory"] == "1.2"
        print_case(f"GET /api/clubs/{DEMO_ADMIN_CLUB_ID}/members — admin view", {}, expected, actual, "Success")
    except AssertionError:
        print_case(f"GET /api/clubs/{DEMO_ADMIN_CLUB_ID}/members — admin view", {}, expected, actual, "Fail")
        raise


def test_list_club_members_forbidden_for_non_admin_club(client: httpx.Client) -> None:
    """Demo persona holds no role at all in DEMO_UNRELATED_CLUB_ID."""
    response = client.get(f"/api/clubs/{DEMO_UNRELATED_CLUB_ID}/members")
    body = response.json()

    expected = {"status": 403, "error.code": "FORBIDDEN"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 403
        assert body["error"]["code"] == "FORBIDDEN"
        print_case(f"GET /api/clubs/{DEMO_UNRELATED_CLUB_ID}/members — not an admin", {}, expected, actual, "Success")
    except AssertionError:
        print_case(f"GET /api/clubs/{DEMO_UNRELATED_CLUB_ID}/members — not an admin", {}, expected, actual, "Fail")
        raise


def test_update_membership_status_by_admin(
    client: httpx.Client,
    base_url: str,
    unique_institutional_identity: dict[str, str],
    created_memberships,
) -> None:
    _signup_and_login(client, unique_institutional_identity)
    join = client.post(f"/api/clubs/{DEMO_ADMIN_CLUB_ID}/members")
    assert join.status_code == 201, join.text
    membership_id = join.json()["data"]["membership"]["id"]
    created_memberships(membership_id)

    payload = {"status": "Active"}
    with httpx.Client(base_url=base_url, timeout=15.0) as admin_client:
        response = admin_client.patch(
            f"/api/clubs/{DEMO_ADMIN_CLUB_ID}/members/{membership_id}", json=payload
        )
    body = response.json()

    expected = {"status": 200, "data.membership.status": "Active", "userStory": "1.4"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["membership"]["status"] == "Active"
        assert body["userStory"] == "1.4"
        print_case(f"PATCH /api/clubs/{DEMO_ADMIN_CLUB_ID}/members/{{memberId}} — admin approves", payload, expected, actual, "Success")
    except AssertionError:
        print_case(f"PATCH /api/clubs/{DEMO_ADMIN_CLUB_ID}/members/{{memberId}} — admin approves", payload, expected, actual, "Fail")
        raise


def test_update_membership_status_404_for_unknown_membership(client: httpx.Client) -> None:
    response = client.patch(
        f"/api/clubs/{DEMO_ADMIN_CLUB_ID}/members/does-not-exist", json={"status": "Active"}
    )
    body = response.json()

    expected = {"status": 404, "error.code": "MEMBERSHIP_NOT_FOUND"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 404
        assert body["error"]["code"] == "MEMBERSHIP_NOT_FOUND"
        print_case("PATCH .../members/does-not-exist — unknown membership", {"status": "Active"}, expected, actual, "Success")
    except AssertionError:
        print_case("PATCH .../members/does-not-exist — unknown membership", {"status": "Active"}, expected, actual, "Fail")
        raise


def test_bulk_import_members_succeeds_for_admin(client: httpx.Client, created_users) -> None:
    """No login -> demo persona is Admin of DEMO_ADMIN_CLUB_ID."""
    email = created_users("pytest.bulk.import@ds.study.iitm.ac.in")
    payload = {
        "clubId": DEMO_ADMIN_CLUB_ID,
        "rows": [{"name": "Pytest Bulk User", "roll": "23tbulk0001", "email": email, "role": "Member"}],
    }
    response = client.post(BULK_IMPORT_PATH, json=payload)
    body = response.json()

    expected = {"status": 200, "data.imported": 1, "data.skipped": 0, "userStory": "1.5"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["imported"] == 1
        assert body["data"]["skipped"] == 0
        assert body["userStory"] == "1.5"
        print_case("POST /api/members/bulk-import — one valid row", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/members/bulk-import — one valid row", payload, expected, actual, "Fail")
        raise


def test_bulk_import_members_forbidden_for_non_admin_club(client: httpx.Client) -> None:
    payload = {
        "clubId": DEMO_UNRELATED_CLUB_ID,
        "rows": [{"name": "Nope", "roll": "23tnope0001", "email": "nope@ds.study.iitm.ac.in"}],
    }
    response = client.post(BULK_IMPORT_PATH, json=payload)
    body = response.json()

    expected = {"status": 403, "error.code": "FORBIDDEN"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 403
        assert body["error"]["code"] == "FORBIDDEN"
        print_case("POST /api/members/bulk-import — not an admin of target club", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/members/bulk-import — not an admin of target club", payload, expected, actual, "Fail")
        raise


def test_bulk_import_members_rejects_empty_rows(client: httpx.Client) -> None:
    payload = {"clubId": DEMO_ADMIN_CLUB_ID, "rows": []}
    response = client.post(BULK_IMPORT_PATH, json=payload)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "VALIDATION_ERROR"
        print_case("POST /api/members/bulk-import — empty rows array", payload, expected, actual, "Success")
    except AssertionError:
        print_case("POST /api/members/bulk-import — empty rows array", payload, expected, actual, "Fail")
        raise
