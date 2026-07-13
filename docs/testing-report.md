# Testing Report - Milestone Work Completed So Far

## Scope

This testing pass covers the business logic and user-facing workflows implemented in the current project build of **Sangam**. The focus is aligned with the sprint rubric:

- automated tests for critical business logic
- workflow-rule validation for important user actions
- manual test cases for visible end-to-end flows
- clear mapping between application behavior and expected outcomes

## Automated Test Coverage

Automated tests were added for shared utility logic and workflow rules that affect visible user behavior, permissions, and state changes.

### Modules covered

| Module | What is validated |
|---|---|
| `lib/format.ts` | issue/task status labels, due-date formatting, pluralization, relative time labels |
| `lib/notification-prefs.ts` | default preference handling, invalid JSON fallback, partial preference merge |
| `lib/interests.ts` | safe parsing of saved interests and rejection of invalid structures |
| `lib/event-tags.ts` | tag normalization and environment-aware serialization for SQLite vs non-SQLite modes |
| `lib/session-helpers.ts` | membership selection logic for persona/role-driven UI |
| `lib/workflow-rules.ts` | RSVP capacity/past-event rules, join-request transitions, task status validation, approval status validation, role authorization guards, event tag parsing, event slug creation |

### How to run

```bash
npm test
```

This uses Node 22's built-in TypeScript stripping, so no extra testing framework is required in the current environment.

### Current automated result

- `33/33 tests passed` on July 12, 2026.

## Important Testing Improvement Included

A workflow inconsistency was fixed during the testing pass:

- The member event RSVP action and the shared volunteer RSVP action were not enforcing the same registration rules.
- RSVP logic is now centralized through shared workflow rules so both paths consistently reject full and past events.

This is a meaningful tester contribution because it both increases coverage and prevents a real behavior mismatch in the product.

## Manual Test Cases

The following cases are written in the format requested in the sprint brief.

| API / Functionality being tested | Inputs / Steps | Expected output | Actual output | Result | Screenshot / Evidence |
|---|---|---|---|---|---|
| Login role switch demo flow | Open `/login`, choose a role using the provided persona button | User is redirected to the matching dashboard (`/admin`, `/coordinator`, `/volunteer`, `/faculty`, or `/app`) | Fill after test execution | Pass / Fail | Example: `login-role-switch-pass.png` |
| Member event RSVP | Open `/app/events/[id]`, click RSVP on an upcoming event with remaining capacity | RSVP state updates successfully and the UI reflects the member's registration | Fill after test execution | Pass / Fail | Example: `member-rsvp-pass.png` |
| Member event RSVP capacity guard | Open an event with full capacity or a past event and attempt RSVP | System blocks registration and does not create an RSVP | Fill after test execution | Pass / Fail | Example: `member-rsvp-capacity-guard.png` |
| Member club join request | Open `/app/clubs`, click join/request action for a club | Membership request is created or membership status changes as designed | Fill after test execution | Pass / Fail | Example: `club-join-request-pass.png` |
| Member club join request withdrawal | Open `/app/clubs` for a pending request and click the requested state button | Pending join request is withdrawn successfully | Fill after test execution | Pass / Fail | Example: `club-join-withdraw-pass.png` |
| Issue submission | Open `/app/issues`, submit issue form with valid title, description, and category | Issue is created and appears in the member/admin issue view | Fill after test execution | Pass / Fail | Example: `issue-create-pass.png` |
| Profile notification preferences | Open `/app/profile`, toggle notification preferences and save | Saved preference state is reflected consistently on reload/navigation | Fill after test execution | Pass / Fail | Example: `profile-notification-prefs-pass.png` |
| Coordinator creates event | Open `/coordinator/new`, submit valid event details | Event is created and visible in coordinator/member event lists | Fill after test execution | Pass / Fail | Example: `coordinator-create-event-pass.png` |
| Coordinator edits event details | Open `/coordinator/events/[id]`, update details | Event data updates and refreshed page shows the new values | Fill after test execution | Pass / Fail | Example: `coordinator-edit-event-pass.png` |
| Volunteer task status update | Open `/volunteer`, change task status from `todo` to `doing` or `done` | Status is saved and the task moves/displays under the correct state | Fill after test execution | Pass / Fail | Example: `volunteer-task-status-pass.png` |
| Admin membership approval | Open `/admin/approvals`, approve or deactivate a membership | Membership status changes to the selected state and approval view refreshes | Fill after test execution | Pass / Fail | Example: `admin-membership-approval-pass.png` |
| Admin event approval | Open `/admin/approvals`, approve/reject a pending event | Event approval state updates and pending list refreshes | Fill after test execution | Pass / Fail | Example: `admin-event-approval-pass.png` |
| Faculty event approval | Open `/faculty/approvals`, approve/reject an event | Approval state updates without needing club-admin privileges | Fill after test execution | Pass / Fail | Example: `faculty-event-approval-pass.png` |
| Announcement creation | Open `/admin/announcements`, create a new announcement | Announcement appears in the announcement list with selected audience settings | Fill after test execution | Pass / Fail | Example: `announcement-create-pass.png` |
| Member directory add member | Open `/admin/members`, add a valid member | New member appears in the directory with correct club/role details | Fill after test execution | Pass / Fail | Example: `member-directory-add-pass.png` |
| CSV bulk import | Open `/admin/members`, upload a valid CSV | Bulk import completes and imported members appear in the directory | Fill after test execution | Pass / Fail | Example: `bulk-import-pass.png` |

## Notes for Sprint Submission

- The current codebase does **not** expose many custom REST API routes yet; most workflow mutations are implemented as **Next.js Server Actions**.
- For the sprint report, these server actions can be documented as the backend operations currently implemented by the team.
- After manual execution, replace each `Actual output` and `Result` value with evidence from the run, including screenshots where useful.
- If any case fails, keep the failed result in the report. That is valuable testing evidence and matches the course guidance.

## Manual Testing Tips

- Take the screenshot immediately after the visible result appears.
- For successful cases, capture the changed UI state.
- For failed cases, capture the error message or incorrect behavior.
- Prefer short, consistent filenames so they are easy to reference in the report.
- Good filename format: `feature-name-pass.png` or `feature-name-fail.png`.

## QA execution record — 13 July 2026

### Automated and HTTP smoke results

| Check | Result | Evidence |
|---|---|---|
| Core workflow/unit tests | PASS | `44/44` tests passed with `npm test` |
| ESLint | PASS | `npm run lint` completed successfully |
| Public landing page | PASS | HTTP `200` from `/` |
| Login page | PASS | HTTP `200` from `/login` |
| Member dashboard and features | PASS | HTTP `200` from `/app`, `/app/clubs`, `/app/events`, `/app/issues`, `/app/profile`; expected page text present |
| Admin dashboard | PASS | HTTP `200` from `/admin`; expected dashboard content present |
| Coordinator dashboard | PASS | HTTP `200` from `/coordinator`; expected dashboard content present |
| Volunteer dashboard | PASS | HTTP `200` from `/volunteer`; expected task content present |
| Faculty dashboard | PASS | HTTP `200` from `/faculty`; expected approval content present |
| Public clubs directory | PASS | HTTP `200` from `/clubs` |
| Production build | BLOCKED BY ENVIRONMENT | `next/font` could not fetch Google Fonts because outbound network access is unavailable |

### Notes for the TA meeting

The dev server was started on `http://localhost:3001` explicitly for QA; this is a test-port choice, not an application defect. Browser automation was not used because it destabilized the local Codex session, so interactive click/form evidence remains pending; route rendering, page content, lint, and automated workflow behavior were verified directly.
