"""Delete pytest-created users from Postgres so the DB stays clean."""

from __future__ import annotations

import os
from pathlib import Path

import psycopg


def load_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url.split("?")[0]

    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, _, value = stripped.partition("=")
            if key.strip() == "DATABASE_URL":
                return value.strip().strip('"').strip("'").split("?")[0]

    raise RuntimeError(
        "DATABASE_URL not found. Set it in the environment or .env "
        "(same value the Next.js app uses)."
    )


def delete_users_by_emails(emails: list[str]) -> int:
    """Delete users (and cascaded rows) matching the given emails. Returns count deleted."""
    normalized = sorted({email.strip().lower() for email in emails if email and email.strip()})
    if not normalized:
        return 0

    with psycopg.connect(load_database_url()) as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "User" WHERE lower(email) = ANY(%s)', (normalized,))
            deleted = cur.rowcount
        conn.commit()
    return deleted


def delete_events_by_ids(event_ids: list[str]) -> int:
    """Delete events (and cascaded Task/Contribution/CountMeIn rows) created during a test."""
    ids = sorted({e for e in event_ids if e})
    if not ids:
        return 0

    with psycopg.connect(load_database_url()) as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "Event" WHERE id = ANY(%s)', (ids,))
            deleted = cur.rowcount
        conn.commit()
    return deleted


def delete_memberships_by_ids(membership_ids: list[str]) -> int:
    """Delete memberships created during a test (e.g. join requests)."""
    ids = sorted({m for m in membership_ids if m})
    if not ids:
        return 0

    with psycopg.connect(load_database_url()) as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "Membership" WHERE id = ANY(%s)', (ids,))
            deleted = cur.rowcount
        conn.commit()
    return deleted
