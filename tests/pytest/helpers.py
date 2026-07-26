"""Shared helpers for Sangam pytest HTTP tests."""

from __future__ import annotations

import sys

# Windows terminals default stdout to cp1252, which can't encode characters
# like club emoji that show up in printed API response bodies. Force UTF-8
# with a safe fallback so -s output never crashes a passing test.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SIGNUP_PATH = "/api/auth/signup"
LOGIN_PATH = "/api/auth/login"
ME_PATH = "/api/auth/me"
INSTITUTIONAL_DOMAIN = "ds.study.iitm.ac.in"

# Requests sent with no session cookie fall back to the hardcoded demo persona
# (backend/auth/mock-session.ts) rather than a real DB user. That persona is
# always "u1" holding Admin of c1, Coordinator of c6, Volunteer of c3, Member
# of c2 — fixed ids seeded by prisma/seed.ts + lib/seed-data.ts. Tests that need
# an Admin/Coordinator/Faculty identity rely on this fallback instead of logging in.
DEMO_ADMIN_CLUB_ID = "c1"
DEMO_COORDINATOR_CLUB_ID = "c6"
DEMO_VOLUNTEER_CLUB_ID = "c3"
DEMO_MEMBER_CLUB_ID = "c2"
DEMO_UNRELATED_CLUB_ID = "c8"


def print_case(title: str, inputs, expected, actual, result: str) -> None:
    """Course-required test case report format (visible with pytest -s)."""
    print(
        f"\nAPI being tested: {title}\n"
        f"Inputs:\n{inputs}\n"
        f"Expected output:\n{expected}\n"
        f"Actual Output:\n{actual}\n"
        f"Result: {result}\n"
    )
