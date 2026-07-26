"""
pytest HTTP tests for POST /api/auth/login (User Story 1.1).

Requires a running Sangam app + database:
  npm run db:up && npm run db:push && npm run dev
  npm run test:pytest

Users created during tests are deleted via the `created_users` fixture.
"""

from __future__ import annotations

import httpx

from helpers import LOGIN_PATH, SIGNUP_PATH, print_case

USER_STORY = "1.1"


def _signup(client: httpx.Client, identity: dict[str, str]) -> None:
    response = client.post(SIGNUP_PATH, json=identity)
    assert response.status_code == 201, response.text


def test_login_rejects_non_institutional_email(client: httpx.Client) -> None:
    payload = {"email": "student@gmail.com", "password": "sangam"}
    response = client.post(LOGIN_PATH, json=payload)
    body = response.json()

    expected = {
        "status": 400,
        "error.code": "VALIDATION_ERROR",
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
            "POST /api/auth/login — non-institutional email",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — non-institutional email",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_rejects_empty_password(client: httpx.Client) -> None:
    payload = {"email": "23s1000123@ds.study.iitm.ac.in", "password": ""}
    response = client.post(LOGIN_PATH, json=payload)
    body = response.json()

    expected = {"status": 400, "error.code": "VALIDATION_ERROR"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "VALIDATION_ERROR"
        print_case(
            "POST /api/auth/login — empty password",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — empty password",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_rejects_invalid_json(client: httpx.Client) -> None:
    response = client.post(
        LOGIN_PATH,
        content="{not-json",
        headers={"Content-Type": "application/json"},
    )
    body = response.json()

    expected = {"status": 400, "error.code": "INVALID_JSON", "userStory": USER_STORY}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 400
        assert body["error"]["code"] == "INVALID_JSON"
        assert body.get("userStory") == USER_STORY
        print_case(
            "POST /api/auth/login — invalid JSON body",
            "{not-json",
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — invalid JSON body",
            "{not-json",
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_rejects_unknown_email(client: httpx.Client) -> None:
    payload = {
        "email": "23tmissing999@ds.study.iitm.ac.in",
        "password": "SecurePass1",
    }
    response = client.post(LOGIN_PATH, json=payload)
    body = response.json()

    expected = {
        "status": 401,
        "error.code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password.",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 401
        assert body["success"] is False
        assert body["error"]["code"] == "INVALID_CREDENTIALS"
        assert body["error"]["message"] == "Invalid email or password."
        assert body.get("userStory") == USER_STORY
        print_case(
            "POST /api/auth/login — unknown email (no enumeration)",
            payload,
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — unknown email (no enumeration)",
            payload,
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_rejects_wrong_password(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    _signup(client, unique_institutional_identity)
    payload = {
        "email": unique_institutional_identity["email"],
        "password": "WrongPass999",
    }
    response = client.post(LOGIN_PATH, json=payload)
    body = response.json()

    expected = {
        "status": 401,
        "error.code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password.",
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 401
        assert body["error"]["code"] == "INVALID_CREDENTIALS"
        assert body["error"]["message"] == "Invalid email or password."
        print_case(
            "POST /api/auth/login — wrong password",
            {**payload, "password": "***"},
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — wrong password",
            {**payload, "password": "***"},
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_succeeds_with_valid_credentials(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    _signup(client, unique_institutional_identity)
    payload = {
        "email": unique_institutional_identity["email"],
        "password": unique_institutional_identity["password"],
    }
    response = client.post(LOGIN_PATH, json=payload)
    body = response.json()

    expected = {
        "status": 200,
        "success": True,
        "data.email": payload["email"],
        "data.next": "/app",
        "userStory": USER_STORY,
        "cookie": "sangam_user_id",
    }
    actual = {
        "status": response.status_code,
        "body": body,
        "cookies": dict(response.cookies),
    }
    try:
        assert response.status_code == 200
        assert body["success"] is True
        assert body["data"]["email"] == payload["email"]
        assert body["data"]["name"] == unique_institutional_identity["name"]
        assert body["data"]["rollNumber"] == unique_institutional_identity["rollNumber"]
        assert body["data"]["isFaculty"] is False
        assert isinstance(body["data"]["memberships"], list)
        assert body["data"]["next"] == "/app"
        assert body.get("userStory") == USER_STORY
        assert response.cookies.get("sangam_user_id")
        print_case(
            "POST /api/auth/login — valid institutional credentials",
            {**payload, "password": "***"},
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — valid institutional credentials",
            {**payload, "password": "***"},
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_honors_safe_callback_url(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    _signup(client, unique_institutional_identity)
    payload = {
        "email": unique_institutional_identity["email"],
        "password": unique_institutional_identity["password"],
        "callbackUrl": "/app/profile",
    }
    response = client.post(LOGIN_PATH, json=payload)
    body = response.json()

    expected = {"status": 200, "data.next": "/app/profile"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["next"] == "/app/profile"
        print_case(
            "POST /api/auth/login — safe callbackUrl",
            {**payload, "password": "***"},
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — safe callbackUrl",
            {**payload, "password": "***"},
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_rejects_unsafe_callback_url(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    _signup(client, unique_institutional_identity)
    payload = {
        "email": unique_institutional_identity["email"],
        "password": unique_institutional_identity["password"],
        "callbackUrl": "https://evil.com",
    }
    response = client.post(LOGIN_PATH, json=payload)
    body = response.json()

    expected = {"status": 200, "data.next": "/app"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["data"]["next"] == "/app"
        assert "evil.com" not in body["data"]["next"]
        print_case(
            "POST /api/auth/login — unsafe callbackUrl ignored",
            {**payload, "password": "***"},
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — unsafe callbackUrl ignored",
            {**payload, "password": "***"},
            expected,
            actual,
            "Fail",
        )
        raise


def test_login_unknown_and_wrong_password_same_message(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    """Production anti-enumeration: unknown email and wrong password look identical."""
    _signup(client, unique_institutional_identity)

    unknown = client.post(
        LOGIN_PATH,
        json={"email": "23tnope0001@ds.study.iitm.ac.in", "password": "SecurePass1"},
    )
    wrong = client.post(
        LOGIN_PATH,
        json={
            "email": unique_institutional_identity["email"],
            "password": "WrongPass999",
        },
    )

    expected = {
        "both_status": 401,
        "both_code": "INVALID_CREDENTIALS",
        "same_message": True,
    }
    actual = {
        "unknown": {"status": unknown.status_code, "body": unknown.json()},
        "wrong": {"status": wrong.status_code, "body": wrong.json()},
    }
    try:
        assert unknown.status_code == 401
        assert wrong.status_code == 401
        assert unknown.json()["error"]["code"] == "INVALID_CREDENTIALS"
        assert wrong.json()["error"]["code"] == "INVALID_CREDENTIALS"
        assert unknown.json()["error"]["message"] == wrong.json()["error"]["message"]
        print_case(
            "POST /api/auth/login — unknown vs wrong password identical response",
            "unknown email + wrong password for existing user",
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "POST /api/auth/login — unknown vs wrong password identical response",
            "unknown email + wrong password for existing user",
            expected,
            actual,
            "Fail",
        )
        raise
