# Capsule — Project Specification

> Academic material sharing platform. MVP-first. Solo hackathon build.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Cloudflare Workers (Hono.js) |
| Database | Cloudflare D1 (SQLite — free, serverless) |
| File Storage | Cloudflare R2 (S3-compatible bucket — free 10 GB) |
| Auth | Firebase Auth (email/password + Google OAuth) |
| Deployment | Cloudflare Pages (frontend) + Workers (API) |
| AI Coding | Kimi K2 in VS Code |

> **Why Cloudflare all-in-one:** No cold starts (Semestra's Netlify pain), no juggling 3 platforms, free tier covers hackathon easily. D1 = SQLite so no Prisma/PgBouncer drama. R2 = your bucket for materials.

---

## Repo Structure

```
Capsule/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/          # App Router pages
│   │   │   │   ├── auth/     # login, register, callback
│   │   │   │   ├── u/        # [slug]/ → [majorId]/ → [semId]/ → [subjectId]/
│   │   │   │   └── page.tsx  # Landing / university list
│   │   │   ├── components/   # Navbar, FileCard, BreadcrumbNav
│   │   │   ├── lib/          # firebase.ts, api.ts, auth-context.tsx
│   │   │   └── types/        # index.ts
│   │   └── public/
│   └── api/                  # Cloudflare Worker (Hono)
│       ├── src/
│       │   ├── routes/       # auth, universities, structure, materials
│       │   ├── middleware/   # firebase-verify.ts, roles.ts
│       │   ├── db/           # d1-client.ts, queries.ts
│       │   ├── storage/      # r2-client.ts
│       │   └── index.ts      # Hono app entry
│       ├── schema.sql        # D1 schema
│       └── wrangler.toml     # Cloudflare config
├── .gitignore
├── package.json              # Root — runs both with concurrently
└── README.md
```

---

## Database Schema (D1 — SQLite)

```sql
-- schema.sql

CREATE TABLE universities (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  slug      TEXT UNIQUE NOT NULL,
  domain    TEXT UNIQUE,           -- e.g. "du.ac.bd"
  view_access TEXT DEFAULT 'PUBLIC' -- PUBLIC | UNIVERSITY_ONLY
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,  -- Firebase UID
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  role          TEXT DEFAULT 'STUDENT', -- STUDENT | CLASS_REP | ADMIN
  university_id TEXT REFERENCES universities(id),
  verified      INTEGER DEFAULT 0, -- 0 = false, 1 = true
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE majors (
  id            TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id),
  name          TEXT NOT NULL,
  code          TEXT,
  UNIQUE(university_id, code)
);

CREATE TABLE semesters (
  id        TEXT PRIMARY KEY,
  major_id  TEXT NOT NULL REFERENCES majors(id),
  number    INTEGER NOT NULL,
  label     TEXT,                  -- e.g. "Spring 2024"
  UNIQUE(major_id, number)
);

CREATE TABLE subjects (
  id          TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES semesters(id),
  name        TEXT NOT NULL,
  code        TEXT
);

CREATE TABLE materials (
  id           TEXT PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(id),
  uploader_id  TEXT NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT DEFAULT 'OTHER', -- LECTURE_NOTE | SLIDE | ASSIGNMENT | QUESTION_PAPER | OTHER
  r2_key       TEXT NOT NULL,        -- R2 object key
  file_name    TEXT NOT NULL,
  file_size    INTEGER,
  mime_type    TEXT,
  deleted      INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);
```

> **IDs:** Use `crypto.randomUUID()` — no external lib needed in Workers.

---

## API Routes (Hono on Cloudflare Workers)

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/sync` | Firebase token | Create/sync user in D1 after Firebase login |
| GET | `/api/auth/me` | Required | Get current user profile |

### Universities
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/universities` | — | List all universities |
| GET | `/api/universities/:slug` | Optional | Get university + majors |
| POST | `/api/universities` | ADMIN | Create university |
| POST | `/api/universities/join` | Required | Join by email domain match |

### Structure
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/majors/:universityId` | — | List majors |
| POST | `/api/majors` | Verified member | Create major |
| GET | `/api/semesters/:majorId` | — | List semesters |
| POST | `/api/semesters` | Verified member | Create semester |
| GET | `/api/subjects/:semesterId` | — | List subjects |
| POST | `/api/subjects` | Verified member | Create subject |

### Materials
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/materials/:subjectId` | Optional | List materials for subject |
| POST | `/api/materials` | Verified | Upload (multipart — file goes to R2) |
| GET | `/api/materials/:id/download` | Optional | Get signed R2 URL (expires 1hr) |
| DELETE | `/api/materials/:id` | CLASS_REP+ | Soft delete |

---

## Auth Flow (Firebase → Worker)

```
1. User signs in via Firebase (frontend)
2. Frontend gets Firebase ID token
3. Every API call: Authorization: Bearer <firebase_id_token>
4. Worker middleware calls Firebase Admin REST API to verify token
5. Extracts uid, email → looks up user in D1
6. Attaches user to request context
```

> No Supabase, no JWT secrets to manage yourself. Firebase handles it.

**firebase-verify.ts (Worker middleware):**
```typescript
const FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;

async function verifyFirebaseToken(token: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
    { method: 'POST', body: JSON.stringify({ idToken: token }) }
  );
  const data = await res.json();
  return data.users?.[0] ?? null;
}
```

---

## File Upload Flow (R2)

```
1. Frontend: multipart POST /api/materials with file + metadata
2. Worker: stream file directly to R2 with key = materials/{universityId}/{subjectId}/{uuid}/{filename}
3. Store r2_key in D1 materials table
4. Download: generate R2 presigned URL (1hr expiry), redirect client
```

> No local disk storage. No file size pain. R2 free tier = 10 GB storage, 1M Class A ops/month.

---

## Role System (Simplified MVP)

| Role | Can Do |
|---|---|
| `STUDENT` | Browse, download, upload materials |
| `CLASS_REP` | Everything + delete materials/structure |
| `ADMIN` | Full control over their university |

- `verified = 1` required to upload (set manually by admin for MVP, or auto on university email domain match)
- Middleware checks: `role >= required_role`

---

## Environment Variables

**Worker (`wrangler.toml` + secrets):**
```toml
# wrangler.toml
name = "capsule-api"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "capsule"
database_id = "YOUR_D1_ID"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "capsule-materials"

[vars]
FIREBASE_PROJECT_ID = "your-project-id"
FRONTEND_URL = "https://capsule.pages.dev"
```

Secrets (set via `wrangler secret put`):
```
FIREBASE_API_KEY
```

**Frontend (`apps/web/.env.local`):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_API_URL=https://capsule-api.your-subdomain.workers.dev
```

---

## Key Differences from Semestra

| Concern | Semestra | Capsule |
|---|---|---|
| Auth | Supabase Auth (PKCE issues) | Firebase Auth — battle-tested |
| DB | PostgreSQL + Prisma + PgBouncer | D1 SQLite — zero config |
| File storage | Local disk + Cloudflare Tunnel | R2 bucket — native cloud |
| Backend | Express on Render (cold starts) | Cloudflare Workers (always warm) |
| Frontend | Netlify (cold starts) | Cloudflare Pages (edge CDN) |
| ORM | Prisma | Raw SQL via D1 binding — fewer moving parts |
| Domain | semestra.page | GitHub repo URL + pages.dev — no cost |

---

## MVP Build Order

```
Phase 1 — Foundation (Day 1)
  [ ] Init monorepo, wrangler setup, D1 + R2 created
  [ ] Firebase project, enable Email + Google OAuth
  [ ] schema.sql pushed to D1
  [ ] Hono Worker skeleton with Firebase verify middleware
  [ ] Next.js with Firebase Auth context, login/register pages

Phase 2 — Core Data (Day 1-2)
  [ ] University CRUD + join by domain
  [ ] Major / Semester / Subject create + list
  [ ] Breadcrumb navigation (u/[slug]/[majorId]/[semId]/[subjectId])

Phase 3 — Materials (Day 2)
  [ ] Upload flow: multipart → R2 → D1
  [ ] List materials per subject
  [ ] Download via R2 signed URL

Phase 4 — Roles + Polish (Day 2-3)
  [ ] Role middleware enforcement
  [ ] Soft delete for CLASS_REP
  [ ] Basic responsive UI with Tailwind
```

---

## Commands

```bash
# Setup
git clone https://github.com/YOUR_USERNAME/Capsule.git
cd Capsule
npm install

# D1
npx wrangler d1 create capsule
npx wrangler d1 execute capsule --file=apps/api/schema.sql

# R2
npx wrangler r2 bucket create capsule-materials

# Dev
npm run dev   # runs Next.js + wrangler dev concurrently

# Deploy
npx wrangler deploy          # API → Cloudflare Workers
# Frontend → push to GitHub → auto-deploys via Cloudflare Pages CI
```

---

*Capsule — built for hackathon, designed to not fall apart.*
