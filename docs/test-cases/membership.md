# Test cases — Membership APIs

User Stories **1.2, 1.3, 1.4, 1.5, 7.1**
Plan ref: `docs/Sangam_M3_M4_Plan.md` Auth & Membership APIs
OpenAPI: `docs/openapi.yaml` → `/api/onboarding/interests`, `/api/members/bulk-import`, `/api/clubs/{id}/members`, `/api/clubs/{id}/members/{memberId}`

**pytest:** `tests/pytest/test_membership.py` — hits the live API over HTTP.

```bash
npm run test:pytest:install
npm run db:up && npm run db:push && npm run db:seed && npm run dev   # separate terminal
npm run test:pytest
```

---

```
API being tested: POST /api/onboarding/interests — valid selection
Inputs:
  { "interests": ["Technical", "Design"] }
  (authenticated via prior POST /api/auth/signup + POST /api/auth/login)
Expected output:
  HTTP 200
  { "success": true, "data": { "interests": ["Technical", "Design"] }, "userStory": "7.1" }
Actual Output:
  Covered by pytest test_onboarding_interests_saves_valid_selection
Result: Success
```

---

```
API being tested: POST /api/onboarding/interests — too many interests
Inputs:
  { "interests": ["Technical","Cultural","Sports","Design","Debate","Writing"] }
Expected output:
  HTTP 400 VALIDATION_ERROR
Actual Output:
  Covered by pytest test_onboarding_interests_rejects_too_many
Result: Success
```

---

```
API being tested: POST /api/clubs/{id}/members — new join request
Inputs:
  POST /api/clubs/c8/members (authenticated, fresh user with no memberships)
Expected output:
  HTTP 201
  { "success": true, "data": { "membership": { "status": "Pending", "clubId": "c8", ... } }, "userStory": "1.3" }
Actual Output:
  Covered by pytest test_join_club_creates_pending_membership
Result: Success
```

---

```
API being tested: POST /api/clubs/{id}/members — duplicate join request
Inputs:
  Same user calling POST /api/clubs/c8/members a second time
Expected output:
  HTTP 409 { "error": { "code": "ALREADY_MEMBER" } }
Actual Output:
  Covered by pytest test_join_club_conflicts_when_already_applied
Result: Success
```

---

```
API being tested: POST /api/clubs/{id}/members — unknown club
Inputs:
  POST /api/clubs/does-not-exist/members
Expected output:
  HTTP 404 { "error": { "code": "CLUB_NOT_FOUND" } }
Actual Output:
  Covered by pytest test_join_club_404_for_unknown_club
Result: Success
```

---

```
API being tested: GET /api/clubs/{id}/members — admin view
Inputs:
  GET /api/clubs/c1/members (no session cookie -> demo persona, Admin of c1)
Expected output:
  HTTP 200 { "success": true, "data": { "members": [...] }, "userStory": "1.2" }
Actual Output:
  Covered by pytest test_list_club_members_succeeds_for_admin
Result: Success
```

---

```
API being tested: GET /api/clubs/{id}/members — not an admin of that club
Inputs:
  GET /api/clubs/c8/members (demo persona holds no role in c8)
Expected output:
  HTTP 403 { "error": { "code": "FORBIDDEN" } }
Actual Output:
  Covered by pytest test_list_club_members_forbidden_for_non_admin_club
Result: Success
```

---

```
API being tested: PATCH /api/clubs/{id}/members/{memberId} — admin approves a pending application
Inputs:
  { "status": "Active" } sent by the demo Admin persona for a membership a fresh
  user just created via POST /api/clubs/c1/members
Expected output:
  HTTP 200 { "data": { "membership": { "status": "Active" } }, "userStory": "1.4" }
Actual Output:
  Covered by pytest test_update_membership_status_by_admin
Result: Success
```

---

```
API being tested: PATCH /api/clubs/{id}/members/{memberId} — unknown membership
Inputs:
  { "status": "Active" } against /api/clubs/c1/members/does-not-exist
Expected output:
  HTTP 404 { "error": { "code": "MEMBERSHIP_NOT_FOUND" } }
Actual Output:
  Covered by pytest test_update_membership_status_404_for_unknown_membership
Result: Success
```

---

```
API being tested: POST /api/members/bulk-import — one valid row
Inputs:
  {
    "clubId": "c1",
    "rows": [{ "name": "Pytest Bulk User", "roll": "23tbulk0001", "email": "<unique>@ds.study.iitm.ac.in", "role": "Member" }]
  }
  (no session cookie -> demo persona, Admin of c1)
Expected output:
  HTTP 200 { "data": { "imported": 1, "skipped": 0 }, "userStory": "1.5" }
Actual Output:
  Covered by pytest test_bulk_import_members_succeeds_for_admin
Result: Success
```

---

```
API being tested: POST /api/members/bulk-import — not an admin of the target club
Inputs:
  { "clubId": "c8", "rows": [{ "name": "Nope", "roll": "23tnope0001", "email": "nope@ds.study.iitm.ac.in" }] }
Expected output:
  HTTP 403 { "error": { "code": "FORBIDDEN" } }
Actual Output:
  Covered by pytest test_bulk_import_members_forbidden_for_non_admin_club
Result: Success
```

---

```
API being tested: POST /api/members/bulk-import — empty rows array
Inputs:
  { "clubId": "c1", "rows": [] }
Expected output:
  HTTP 400 { "error": { "code": "VALIDATION_ERROR" } }
Actual Output:
  Covered by pytest test_bulk_import_members_rejects_empty_rows
Result: Success
```
