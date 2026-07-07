# Sangam

A community and society management platform. Single source of truth for membership, events, places, equipment, tasks, and communication, replacing WhatsApp groups, Google Forms, and spreadsheets.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (SQLite for local dev)
- NextAuth.js / JWT auth

## Getting Started

```bash
git clone <repo-url>
cd sangam
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

App runs at `http://localhost:3000`

## Project Structure

```
app/
  (public)/        landing, discover, login, signup
  (member)/        dashboard, clubs, events, issues, announcements, faq, profile
  (admin)/         dashboard, members, approvals, issues, announcements, activity, transparency, handover
  (coordinator)/   dashboard, events, volunteers, places
  (volunteer)/     tasks, events, faq
  (faculty)/       oversight, approvals, activity
  api/             route handlers
components/        ui/, shared/, member/, admin/, coordinator/, volunteer/, faculty/, forms/
lib/                types, mock-data, store, utils, prisma, auth
prisma/             schema.prisma
```

## Roles

Admin, Event Coordinator, Club Member, Volunteer, Faculty Coordinator. A user can hold multiple roles across different clubs.

## Team — Dhurandhar (MAY2026-Team-004)

| Name | Role |
|---|---|
| Alok Kumar Tripathi | Team Lead, Backend |
| Vishal Singh Baraiya | Product Manager |
| Pardhiv Nukasani | Frontend |
| Purnendu Shukla | Backend, Code Review |
| Yalla Ashish Chandra Reddy | Testing |

## License

Academic project — IITM BS Software Engineering, May 2026 term.
