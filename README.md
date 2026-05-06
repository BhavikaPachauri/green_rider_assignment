# Green Rider Projects — Project & Task Tracker

A full-stack web app for **project and team management** with role-based access
(Admin / Member), task assignment, status tracking, due dates, and overdue
alerts.

- **Backend**: Node.js + Express + Prisma + MySQL (MariaDB-compatible).
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind v4.
- **Auth**: JWT access + refresh tokens with rotation.
- **Deployment**: Railway-ready (`railway.json` in both `Backend/` and
  `frontend/`).

---

## Features

### Authentication
- Sign up with `name`, `email`, `password`, and a chosen `role` (`ADMIN`
  or `MEMBER`).
- Login returns an access + refresh token pair.
- Access tokens auto-refresh from the frontend on 401s.
- `/auth/me` endpoint returns the current user.

### Projects & Teams
- Any logged-in user can create projects.
- The creator becomes the project **owner**.
- Owner / Admin can:
  - Edit and delete the project.
  - Invite members by email.
  - Remove members.
- Members and the owner see the project on their dashboard. Admins see all.

### Tasks
- Each task lives inside a project.
- Fields: `title`, `description`, `status` (`TODO` / `IN_PROGRESS` / `DONE`),
  `dueDate`, `assignee`.
- Permissions:
  - Owner / Admin / Creator can edit any field or delete.
  - Assignee can change status only.
  - Other project members have read-only access.
- Filter by status, project, search text, **overdue**, or "assigned to me".

### Dashboard
- Stat cards: total projects, open tasks, done, overdue, assigned to me, plus
  team count for admins.
- "Upcoming tasks" panel shows the next five open tasks by due date.

---

## Project Structure

```
ernest_assignment/
├── Backend/                  # Express API
│   ├── controllers/          # auth, project, task, dashboard, user
│   ├── routes/
│   ├── middleware/auth.ts    # authMiddleware + requireRole
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── lib/                  # prisma client + jwt helpers
│   ├── index.ts
│   ├── railway.json
│   └── .env.example
└── frontend/                 # Next.js app
    ├── app/                  # routes (/, /login, /register, /dashboard)
    ├── components/
    │   ├── auth/auth-screen.tsx
    │   ├── dashboard/        # shell + overview / projects / tasks views
    │   └── providers/        # auth + toast
    ├── lib/api.ts            # typed fetch helpers
    ├── types/api.ts
    ├── railway.json
    └── .env.example
```

---

## Local Development

### 1. Prerequisites
- Node.js 20+ and npm
- A MySQL or MariaDB instance (local Docker is fine)

### 2. Backend
```bash
cd Backend
cp .env.example .env
# Edit .env — set DATABASE_URL (or DATABASE_HOST/USER/PASSWORD/NAME)
# and JWT secrets.

npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```
The API will be available on `http://localhost:5000`.

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL to your backend URL.

npm install
npm run dev
```
Open `http://localhost:3000`.

---

## API Reference

All authenticated endpoints expect `Authorization: Bearer <accessToken>`.

### Auth
| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create account (`name`, `email`, `password`, optional `role`) |
| POST | `/auth/login` | Returns `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | Rotates the refresh token |
| POST | `/auth/logout` | Invalidates the refresh session |
| GET  | `/auth/me` | Current user profile |

### Projects
| Method | Path | Description |
| --- | --- | --- |
| GET | `/projects` | List accessible projects (admin sees all) |
| POST | `/projects` | Create — body: `{ name, description? }` |
| GET | `/projects/:id` | Project detail with members |
| PATCH | `/projects/:id` | Update name / description (owner or admin) |
| DELETE | `/projects/:id` | Delete (owner or admin) |
| POST | `/projects/:id/members` | Add member by `email` or `userId` |
| DELETE | `/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Path | Description |
| --- | --- | --- |
| GET | `/tasks` | List with `page`, `limit`, `search`, `status`, `projectId`, `assigneeId`, `mine`, `overdue` |
| POST | `/tasks` | Create — body: `{ title, projectId, description?, status?, dueDate?, assigneeId? }` |
| GET | `/tasks/:id` | Detail |
| PATCH | `/tasks/:id` | Update fields (RBAC enforced per-field) |
| DELETE | `/tasks/:id` | Delete (creator / owner / admin) |

### Misc
| Method | Path | Description |
| --- | --- | --- |
| GET | `/dashboard/summary` | Totals + upcoming tasks for the dashboard |
| GET | `/users?search=` | List users (used to assign tasks / invite members) |
| GET | `/health` | Liveness check (used by Railway) |

---

## Deploying to Railway

Railway project layout:
1. Provision a **MySQL** database service.
2. Create a service from the `Backend/` directory.
3. Create a service from the `frontend/` directory.

### Backend service
Set the following variables on the backend service:
- `DATABASE_URL` — paste the MySQL connection URL from Railway.
- `JWT_ACCESS_SECRET` — long random string.
- `JWT_REFRESH_SECRET` — long random string.
- `CORS_ORIGINS` — your deployed frontend origin (e.g. `https://Green Rider-projects.up.railway.app`).
- `PORT` — Railway sets this automatically; the app respects it.

`Backend/railway.json` runs:
```
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
node dist/index.js
```
Railway uses `/health` for liveness checks.

### Frontend service
Variables:
- `NEXT_PUBLIC_API_BASE_URL` — public URL of the backend service.

`frontend/railway.json` builds with `npm run build` and starts with `npm run start`.

---

## Notes
- The schema lives in `Backend/prisma/schema.prisma`. Migrations under
  `Backend/prisma/migrations/` are applied with `prisma migrate deploy`.
- Refresh tokens are hashed before being stored in the DB and rotated on
  every refresh.
- Role-based access is enforced server-side; the frontend hides actions a
  user can't perform but the backend re-checks every request.
