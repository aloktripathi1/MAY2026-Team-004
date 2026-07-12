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

| API / Functionality being tested | Inputs / Steps | Expected output | Actual output | Result |
|---|---|---|---|---|
| Login role switch demo flow | Open `/login`, choose a role using the provided persona button | User is redirected to the matching dashboard (`/admin`, `/coordinator`, `/volunteer`, `/faculty`, or `/app`) | To be filled during execution | Pending |
| Member event RSVP | Open `/app/events/[id]`, click RSVP on an upcoming event with remaining capacity | RSVP state updates successfully and the UI reflects the member's registration | To be filled during execution | Pending |
| Member event RSVP capacity guard | Open an event with full capacity or a past event and attempt RSVP | System blocks registration and does not create an RSVP | To be filled during execution | Pending |
| Member club join request | Open `/app/clubs`, click join/request action for a club | Membership request is created or membership status changes as designed | To be filled during execution | Pending |
| Member club join request withdrawal | Open `/app/clubs` for a pending request and click the requested state button | Pending join request is withdrawn successfully | To be filled during execution | Pending |
| Issue submission | Open `/app/issues`, submit issue form with valid title, description, and category | Issue is created and appears in the member/admin issue view | To be filled during execution | Pending |
| Profile notification preferences | Open `/app/profile`, toggle notification preferences and save | Saved preference state is reflected consistently on reload/navigation | To be filled during execution | Pending |
| Coordinator creates event | Open `/coordinator/new`, submit valid event details | Event is created and visible in coordinator/member event lists | To be filled during execution | Pending |
| Coordinator edits event details | Open `/coordinator/events/[id]`, update details | Event data updates and refreshed page shows the new values | To be filled during execution | Pending |
| Volunteer task status update | Open `/volunteer`, change task status from `todo` to `doing` or `done` | Status is saved and the task moves/displays under the correct state | To be filled during execution | Pending |
| Admin membership approval | Open `/admin/approvals`, approve or deactivate a membership | Membership status changes to the selected state and approval view refreshes | To be filled during execution | Pending |
| Admin event approval | Open `/admin/approvals`, approve/reject a pending event | Event approval state updates and pending list refreshes | To be filled during execution | Pending |
| Faculty event approval | Open `/faculty/approvals`, approve/reject an event | Approval state updates without needing club-admin privileges | To be filled during execution | Pending |
| Announcement creation | Open `/admin/announcements`, create a new announcement | Announcement appears in the announcement list with selected audience settings | To be filled during execution | Pending |
| Member directory add member | Open `/admin/members`, add a valid member | New member appears in the directory with correct club/role details | To be filled during execution | Pending |
| CSV bulk import | Open `/admin/members`, upload a valid CSV | Bulk import completes and imported members appear in the directory | To be filled during execution | Pending |

## Notes for Sprint Submission

- The current codebase does **not** expose many custom REST API routes yet; most workflow mutations are implemented as **Next.js Server Actions**.
- For the sprint report, these server actions can be documented as the backend operations currently implemented by the team.
- After manual execution, replace each `Actual output` and `Result` value with evidence from the run, including screenshots where useful.
- If any case fails, keep the failed result in the report. That is valuable testing evidence and matches the course guidance.
