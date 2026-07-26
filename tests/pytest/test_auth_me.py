"""
pytest HTTP tests for GET /api/auth/me (User Story 1.1 + multi-role).

Requires a running Sangam app + database:
  npm run db:up && npm run db:push && npm run dev
  npm run test:pytest
"""

from __future__ import annotations

import httpx

from helpers import LOGIN_PATH, ME_PATH, SIGNUP_PATH, print_case

USER_STORY = "1.1"


def _signup(client: httpx.Client, identity: dict[str, str]) -> httpx.Response:
    response = client.post(SIGNUP_PATH, json=identity)
    assert response.status_code == 201, response.text
    return response


def _login(client: httpx.Client, identity: dict[str, str]) -> httpx.Response:
    response = client.post(
        LOGIN_PATH,
        json={"email": identity["email"], "password": identity["password"]},
    )
    assert response.status_code == 200, response.text
    return response


def test_me_rejects_unauthenticated(client: httpx.Client) -> None:
    client.cookies.clear()
    response = client.get(ME_PATH)
    body = response.json()

    expected = {
        "status": 401,
        "error.code": "UNAUTHENTICATED",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 401
        assert body["success"] is False
        assert body["error"]["code"] == "UNAUTHENTICATED"
        assert body.get("userStory") == USER_STORY
        print_case(
            "GET /api/auth/me — unauthenticated",
            "no session cookies",
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "GET /api/auth/me — unauthenticated",
            "no session cookies",
            expected,
            actual,
            "Fail",
        )
        raise


def test_me_does_not_return_mock_demo_user(client: httpx.Client) -> None:
    client.cookies.clear()
    response = client.get(ME_PATH)
    body = response.json()

    expected = {
        "status": 401,
        "not_demo_id": "u1",
        "not_demo_email": "23s1000123@ds.study.iitm.ac.in",
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 401
        assert body.get("success") is False
        # Must never invent mock-session demo user when cookies are absent.
        assert body.get("data", {}).get("id") != "u1"
        assert "23s1000123@ds.study.iitm.ac.in" not in str(body.get("data", {}))
        print_case(
            "GET /api/auth/me — no mock demo fallback",
            "no session cookies",
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "GET /api/auth/me — no mock demo fallback",
            "no session cookies",
            expected,
            actual,
            "Fail",
        )
        raise


def test_me_works_with_signup_session_cookies(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    client.cookies.clear()
    _signup(client, unique_institutional_identity)
    response = client.get(ME_PATH)
    body = response.json()

    expected = {
        "status": 200,
        "data.email": unique_institutional_identity["email"],
        "data.home": "/app",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["success"] is True
        assert body["data"]["email"] == unique_institutional_identity["email"]
        assert body["data"]["name"] == unique_institutional_identity["name"]
        assert body["data"]["rollNumber"] == unique_institutional_identity["rollNumber"]
        assert body["data"]["isFaculty"] is False
        assert isinstance(body["data"]["memberships"], list)
        assert isinstance(body["data"]["roles"], list)
        assert body["data"]["home"] == "/app"
        assert body.get("userStory") == USER_STORY
        print_case(
            "GET /api/auth/me — after signup cookies",
            unique_institutional_identity["email"],
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "GET /api/auth/me — after signup cookies",
            unique_institutional_identity["email"],
            expected,
            actual,
            "Fail",
        )
        raise


def test_me_returns_current_user_after_login(
    client: httpx.Client,
    unique_institutional_identity: dict[str, str],
) -> None:
    client.cookies.clear()
    _signup(client, unique_institutional_identity)
    client.cookies.clear()
    _login(client, unique_institutional_identity)
    response = client.get(ME_PATH)
    body = response.json()

    expected = {
        "status": 200,
        "success": True,
        "data.email": unique_institutional_identity["email"],
        "roles": "list",
        "memberships": "list",
        "userStory": USER_STORY,
    }
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body["success"] is True
        assert body["data"]["id"]
        assert body["data"]["email"] == unique_institutional_identity["email"]
        assert body["data"]["name"] == unique_institutional_identity["name"]
        assert isinstance(body["data"]["memberships"], list)
        assert isinstance(body["data"]["roles"], list)
        assert body["data"]["home"] in {
            "/app",
            "/admin",
            "/coordinator",
            "/volunteer",
            "/faculty",
        }
        assert body.get("userStory") == USER_STORY
        print_case(
            "GET /api/auth/me — after login",
            unique_institutional_identity["email"],
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "GET /api/auth/me — after login",
            unique_institutional_identity["email"],
            expected,
            actual,
            "Fail",
        )
        raise


def test_mock_auth_stub_still_separate_from_me(client: httpx.Client) -> None:
    response = client.get("/api/auth/session")
    body = response.json()

    expected = {"status": 200, "mode": "mock"}
    actual = {"status": response.status_code, "body": body}
    try:
        assert response.status_code == 200
        assert body.get("mode") == "mock"
        print_case(
            "GET /api/auth/[...nextauth] — mock stub separate from /me",
            "GET /api/auth/session",
            expected,
            actual,
            "Success",
        )
    except AssertionError:
        print_case(
            "GET /api/auth/[...nextauth] — mock stub separate from /me",
            "GET /api/auth/session",
            expected,
            actual,
            "Fail",
        )
        raise
