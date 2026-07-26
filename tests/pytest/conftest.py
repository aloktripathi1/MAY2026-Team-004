"""Shared fixtures for Sangam API pytest suite (HTTP against Next.js Route Handlers)."""

from __future__ import annotations

import os
import uuid

import httpx
import pytest

from db_cleanup import delete_events_by_ids, delete_memberships_by_ids, delete_users_by_emails
from helpers import INSTITUTIONAL_DOMAIN

BASE_URL = os.getenv("SANGAM_BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def api_available(base_url: str) -> bool:
    """True when the Next.js app responds (any non-5xx means the process is up)."""
    try:
        with httpx.Client(base_url=base_url, timeout=3.0) as client:
            # Mock auth stub is always mounted; use it as a liveness probe.
            response = client.get("/api/auth/session")
            return response.status_code < 500
    except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError):
        return False


@pytest.fixture
def client(base_url: str, api_available: bool) -> httpx.Client:
    if not api_available:
        pytest.fail(
            f"Sangam API is not reachable at {base_url}. "
            "Start Postgres (`npm run db:up`), then the app (`npm run dev`), "
            "and re-run: npm run test:pytest"
        )
    with httpx.Client(base_url=base_url, timeout=15.0, follow_redirects=False) as http:
        yield http


@pytest.fixture
def created_users():
    """
    Track emails created by a test; delete those users after the test finishes
    (pass or fail) so the database stays clean.
    """
    emails: list[str] = []

    def track(email: str) -> str:
        normalized = email.strip().lower()
        emails.append(normalized)
        return normalized

    yield track

    if emails:
        deleted = delete_users_by_emails(emails)
        print(f"\n[cleanup] deleted {deleted} test user(s): {', '.join(emails)}")


@pytest.fixture
def created_events():
    """Track event ids created by a test; delete them after the test finishes."""
    ids: list[str] = []

    def track(event_id: str) -> str:
        ids.append(event_id)
        return event_id

    yield track

    if ids:
        deleted = delete_events_by_ids(ids)
        print(f"\n[cleanup] deleted {deleted} test event(s): {', '.join(ids)}")


@pytest.fixture
def created_memberships():
    """Track membership ids created by a test; delete them after the test finishes."""
    ids: list[str] = []

    def track(membership_id: str) -> str:
        ids.append(membership_id)
        return membership_id

    yield track

    if ids:
        deleted = delete_memberships_by_ids(ids)
        print(f"\n[cleanup] deleted {deleted} test membership(s): {', '.join(ids)}")


@pytest.fixture
def unique_institutional_identity(created_users) -> dict[str, str]:
    """Fresh roll/email each call so create/conflict tests do not collide."""
    suffix = uuid.uuid4().hex[:8]
    roll = f"23t{suffix}"
    identity = {
        "name": "Pytest User",
        "email": f"{roll}@{INSTITUTIONAL_DOMAIN}",
        "rollNumber": roll,
        "password": "SecurePass1",
    }
    created_users(identity["email"])
    return identity
