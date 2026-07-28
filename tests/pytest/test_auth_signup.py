"""
pytest HTTP tests for POST /api/auth/signup (User Story 1.1).

Requires a running Sangam app + database:
  npm run db:up && npm run db:push && npm run dev
  npm run test:pytest

Users created during tests are deleted from Postgres after each test
via the `created_users` fixture (see conftest.py / db_cleanup.py).
"""

from __future__ import annotations

import uuid

import httpx

from helpers import SIGNUP_PATH, print_case

USER_STORY = "1.1"


def test_signup_rejects_non_institutional_email(client: httpx.Client) -> None:
    payload = {
        "name": "Outside User",
        "email": "student@gmail.com",
        "rollNumber": "23s1000888",
        "password": "SecurePass1",
    }
    response = client.post(SIGNUP_PATH, json=payload)
    body = response.json()

    expected = {
        "status": 400,
        "success": False,
        "error.code": "VALIDATION_ERROR",
        "message_contains": "@ds.study.iitm.ac.in",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert "@ds.study.iitm.ac.in" in body["error"]["message"]
        assert body.get("userStory") == USER_STORY
        print_case(
            "POST /api/auth/signup — non-institutional email",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — non-institutional email",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_rejects_spoofed_domain_substring(client: httpx.Client) -> None:
    payload = {
        "name": "Spoof User",
        "email": "evil@ds.study.iitm.ac.in.evil.com",
        "rollNumber": "23s1000777",
        "password": "SecurePass1",
    }
    response = client.post(SIGNUP_PATH, json=payload)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"
        print_case(
            "POST /api/auth/signup — spoofed domain substring",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — spoofed domain substring",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_rejects_short_password(client: httpx.Client) -> None:
    payload = {
        "name": "Ananya Rao",
        "email": "23s1000999@ds.study.iitm.ac.in",
        "rollNumber": "23s1000999",
        "password": "short",
    }
    response = client.post(SIGNUP_PATH, json=payload)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR", "message": "at least 8"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert "at least 8" in body["error"]["message"]
        print_case(
            "POST /api/auth/signup — password too short",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — password too short",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_rejects_missing_name(client: httpx.Client) -> None:
    payload = {
        "name": "  ",
        "email": "23s1000999@ds.study.iitm.ac.in",
        "rollNumber": "23s1000999",
        "password": "SecurePass1",
    }
    response = client.post(SIGNUP_PATH, json=payload)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "VALIDATION_ERROR"
        print_case(
            "POST /api/auth/signup — missing name",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — missing name",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_rejects_invalid_json(client: httpx.Client) -> None:
    response = client.post(
        SIGNUP_PATH,
        content="{not-json",
        headers={"Content-Type": "application/json"},
    )
    body = response.json()

    expected = {
        "status": 400,
        "error.code": "INVALID_JSON",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["success"] is False
        assert body["error"]["code"] == "INVALID_JSON"
        assert body.get("userStory") == USER_STORY
        print_case(
            "POST /api/auth/signup — invalid JSON body",
            "{not-json",
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — invalid JSON body",
            "{not-json",
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_creates_account_with_institutional_email(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    # unique_institutional_identity registers email for post-test DB cleanup
    payload = unique_institutional_identity
    response = client.post(SIGNUP_PATH, json=payload)
    body = response.json()

    expected = {
        "status": 201,
        "success": True,
        "data.email": payload["email"],
        "data.rollNumber": payload["rollNumber"],
        "data.next": "/signup/onboarding",
        "userStory": USER_STORY,
        "set-cookie": "sangam_user_id",
    }
    actual = {
        "status": response.status_code,
        "body": body,
        "cookies": dict(response.cookies),
    }
    try:
        assert response.status_code == 201
        assert body["success"] is True
        assert body["data"]["email"] == payload["email"]
        assert body["data"]["name"] == payload["name"]
        assert body["data"]["rollNumber"] == payload["rollNumber"]
        assert body["data"]["next"] == "/signup/onboarding"
        assert body["data"]["id"]
        assert body.get("userStory") == USER_STORY
        assert response.cookies.get("sangam_user_id")
        print_case(
            "POST /api/auth/signup — valid institutional signup",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — valid institutional signup",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_lowercases_email(client: httpx.Client, created_users) -> None:
    suffix = uuid.uuid4().hex[:8]
    roll = f"23u{suffix}"
    payload = {
        "name": "Case Test",
        "email": f"{roll.upper()}@DS.STUDY.IITM.AC.IN",
        "rollNumber": roll,
        "password": "SecurePass1",
    }
    created_users(f"{roll}@ds.study.iitm.ac.in")
    expected_email = f"{roll}@ds.study.iitm.ac.in"
    response = client.post(SIGNUP_PATH, json=payload)
    body = response.json()

    expected = {"status": 201, "data.email": expected_email}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 201
        assert body["data"]["email"] == expected_email
        print_case(
            "POST /api/auth/signup — email normalized to lowercase",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — email normalized to lowercase",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_duplicate_email_returns_409(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    # First user is tracked via unique_institutional_identity → deleted after test
    first = unique_institutional_identity
    created = client.post(SIGNUP_PATH, json=first)
    assert created.status_code == 201, created.text

    second = {
        **first,
        "name": "Duplicate Email",
        "rollNumber": f"{first['rollNumber']}x",
    }
    response = client.post(SIGNUP_PATH, json=second)
    body = response.json()

    expected = {
        "status": 409,
        "error.code": "EMAIL_EXISTS",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 409
        assert body["success"] is False
        assert body["error"]["code"] == "EMAIL_EXISTS"
        assert body.get("userStory") == USER_STORY
        print_case(
            "POST /api/auth/signup — duplicate email",
            second,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — duplicate email",
            second,
            expected,
            actual,
            "Fail",
        )
        raise


def test_signup_duplicate_roll_returns_409(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    # First user is tracked via unique_institutional_identity → deleted after test
    first = unique_institutional_identity
    created = client.post(SIGNUP_PATH, json=first)
    assert created.status_code == 201, created.text

    second = {
        **first,
        "name": "Duplicate Roll",
        "email": f"alt-{first['email']}",
    }
    response = client.post(SIGNUP_PATH, json=second)
    body = response.json()

    expected = {
        "status": 409,
        "error.code": "ROLL_EXISTS",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 409
        assert body["success"] is False
        assert body["error"]["code"] == "ROLL_EXISTS"
        assert body.get("userStory") == USER_STORY
        print_case(
            "POST /api/auth/signup — duplicate roll number",
            second,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/signup — duplicate roll number",
            second,
            expected,
            actual,
            "Fail",
        )
        raise


def test_mock_auth_stub_remains_separate(client: httpx.Client) -> None:
    response = client.get("/api/auth/session")
    body = response.json()

    expected = {"status": 200, "mode": "mock"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body.get("mode") == "mock"
        print_case(
            "GET /api/auth/[...nextauth] — mock stub separate from real signup",
            "GET /api/auth/session",
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "GET /api/auth/[...nextauth] — mock stub separate from real signup",
            "GET /api/auth/session",
            expected,
            actual,
            "Fail",
        )
        raise
