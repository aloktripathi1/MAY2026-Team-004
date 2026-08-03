# Ask Sangam — demo questions (issue #116)

Manual verification script for `POST /api/assistant/query`'s three-step Claude
flow (classify -> scoped Prisma query -> generate). Run each question through
the Ask Sangam panel while logged in as the listed seeded account
(`prisma/seed.ts` / `tests/integration/helpers.ts` `SEEDED_ACCOUNTS`), and
confirm the answer is grounded in real data with the expected `sourceType`.

## event_lookup

| Account | Question | Expect |
|---|---|---|
| Member (Yalla, Paradox only) | "When's my next event?" | Names Paradox's actual next upcoming event, date/time/venue match the DB. `sourceType: "event"`. |
| Member (Yalla, Paradox only) | "Is Winter Debate Open still open for registration?" | Answer reflects the real `going`/`capacity` numbers for that event. `sourceType: "event"`. |
| Faculty (no club membership) | "What events are coming up?" | Not restricted to one club — faculty is institution-wide oversight. `sourceType: "event"`. |

## task_lookup

| Account | Question | Expect |
|---|---|---|
| Coordinator (Purnendu, E-Cell) | "What's on my task list?" | Lists their real assigned, not-yet-done tasks with correct due dates. `sourceType: "task"`. |
| Volunteer (Pardhiv, Sarga) | "What tasks am I assigned to for my next event?" | Grounded in their actual `Task` rows only. `sourceType: "task"`. |

## announcement_lookup

| Account | Question | Expect |
|---|---|---|
| Admin (Vishal, CodeChef) | "What's the latest announcement for my club?" | Matches the real most-recent/pinned `Announcement` for CodeChef (or an institution-wide `audience: All` one). `sourceType: "announcement"`. |
| Member (Yalla, Paradox) | "Any news from my club?" | Only Paradox's or institution-wide announcements — never another club's. `sourceType: "announcement"`. |

## membership_status

| Account | Question | Expect |
|---|---|---|
| Member (Yalla) | "Which clubs am I a member of, and what's my role?" | Lists exactly their real memberships (Paradox / Member). `sourceType: "membership"`. |
| Demo (Ananya, multi-role) | "What are all my club memberships?" | Lists all four real memberships (CodeChef Admin, E-Cell Coordinator, Sarga Volunteer, Paradox Member). `sourceType: "membership"`. |

## Cross-club scope leak check (must NOT leak)

| Account | Question | Expect |
|---|---|---|
| Member (Yalla, Paradox only) | Ask about a real CodeChef-only event by name | The scoped Prisma query returns zero rows for a club Yalla isn't in, so the fixed no-data response is returned — the real CodeChef event details must never appear in the answer. `sourceType: null`, answer is exactly `"I don't have that information."` |

## Deliberately unanswerable question (safety rule)

| Account | Question | Expect |
|---|---|---|
| Member (no assigned tasks in seed data) | "What tasks have been assigned to me?" | Classifies as `task_lookup`, the scoped query legitimately returns zero rows, so the generation call is skipped entirely and the fixed response `"I don't have that information."` is returned — never a guessed/hallucinated answer. `sourceType: null`. |

Automated coverage for all of the above lives in
`tests/integration/assistant.test.ts` (requires `ANTHROPIC_API_KEY` set and
the dev server + seeded DB running: `npm run test:integration`).
