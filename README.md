# Capsule

## Live Demo

- **Live Frontend**: https://capsule-frontend.pages.dev
- **Live API**: https://capsule.fahim2443.workers.dev

## Screenshots

![alt text](<Screenshot 2026-05-30 at 1.45.15 AM-1.png>)

Academic material sharing platform. MVP built for hackathon.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Cloudflare Workers (Hono.js) |
| Database | Cloudflare D1 (SQLite) |
| File Storage | Cloudflare R2 (S3-compatible) |
| Auth | Firebase Auth (email/password + Google OAuth) |

## Project Structure

```
Capsule/
├── apps/
│   ├── web/       # Next.js frontend
│   └── api/       # Hono Cloudflare Worker
├── package.json   # Root workspace
└── README.md
```

## Setup

### 1. Prerequisites

- Node.js 18+
- npm 9+ (workspaces support)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and logged in

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com) and enable:
- Email/Password authentication
- Google sign-in method

Copy your Firebase config into `apps/web/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 4. Configure Worker Secrets

Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` and fill in:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

```env
FIREBASE_API_KEY=your-firebase-api-key
```

### 5. Set Up D1 Database (Local)

```bash
cd apps/api
npx wrangler d1 create capsule
# Copy the database_id from the output into wrangler.toml
npx wrangler d1 execute capsule --local --file=schema.sql
```

### 6. Set Up R2 Bucket (Optional for Local Dev)

```bash
cd apps/api
npx wrangler r2 bucket create capsule-materials
```

For file downloads to work locally without R2 credentials, the Worker will proxy files directly.

### 7. Run Dev Servers

```bash
npm run dev
```

This starts both:
- Next.js frontend at http://localhost:3000
- Hono API at http://localhost:8787

## Deployment

### Deploy API

```bash
cd apps/api
npx wrangler deploy
```

### Deploy Frontend

Push to GitHub and connect to Cloudflare Pages, or use:

```bash
cd apps/web
npm run build
# Deploy the `out` or `.next` folder to Cloudflare Pages
```

## Auth Flow

1. User signs in via Firebase (frontend)
2. Frontend calls `POST /api/auth/sync` with Firebase ID token
3. Worker verifies token and creates/updates user in D1
4. All subsequent API calls attach `Authorization: Bearer <idToken>`

## File Upload Flow

1. Frontend: multipart POST `/api/materials` with file + metadata
2. Worker: parses multipart, streams file to R2 with key `materials/{universityId}/{subjectId}/{uuid}/{filename}`
3. Stores metadata in D1
4. Download: generates presigned R2 URL (1hr expiry) or proxies through Worker

## Role System

| Role | Permissions |
|---|---|
| `STUDENT` | Browse, download, upload materials |
| `CLASS_REP` | Everything + delete any material |
| `ADMIN` | Full control, create universities |

- `verified = 1` required to upload (auto-set on university email domain match)

## Data Model

```
University → Major → Semester → Subject → Material
```

Navigate via breadcrumbs: `/u/{slug}/{majorId}/{semId}/{subjectId}`

## Differences from Semestra

| Concern | Semestra | Capsule |
|---|---|---|
| Auth | Supabase Auth | Firebase Auth |
| DB | PostgreSQL + Prisma | D1 SQLite (raw SQL) |
| File Storage | Local disk + S3 | R2 bucket |
| Backend | Express on Render | Hono on Cloudflare Workers |
| Frontend Hosting | Netlify | Cloudflare Pages |

## Commands

```bash
npm run dev          # Start both frontend and API
npm run dev:web      # Start Next.js only
npm run dev:api      # Start Worker only
npm run deploy:api   # Deploy API to Cloudflare Workers
```

## License

Personal project — no restrictions.
