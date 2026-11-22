# VLU Lab Attendance & Management System

A web application for Van Lang University lab staff to manage student duty schedules, record attendance, track lab equipment, and follow equipment incidents. Students check in at a barcode scan station or from their phones by scanning the lab's rotating QR code.

Built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma. The default database is a local SQLite file, so you do not need to install or run a database server.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [How check-in works](#how-check-in-works)
- [Pages](#pages)
- [Commands](#commands)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)
- [Deployment notes](#deployment-notes)
- [Documentation](#documentation)

## Features

- **Attendance.** Scan student cards with a USB barcode scanner or a webcam, or let students check in from a phone through a rotating, signed QR session.
- **Students.** Maintain student records, import student lists, and issue or revoke individual QR codes. Individual codes can be sent by email through Brevo.
- **Duty schedules.** Assign students to labs and shifts, then review their attendance.
- **Lab operations.** Manage the equipment inventory and follow each incident through to resolution.
- **Administration.** Dashboard summaries, audit logs, staff accounts, and account settings.
- **Languages.** Vietnamese and English.

## Requirements

- Node.js 18 or later, with npm
- Git, if you are cloning the repository

## Quick start

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/DrNearl/Group5.git
   cd Group5
   npm install
   ```

2. Create your environment file from the template:

   ```bash
   # macOS / Linux
   cp .env.example .env

   # Windows PowerShell
   Copy-Item .env.example .env
   ```

3. Open `.env` and replace the example values of `JWT_SECRET` and `QR_JWT_SECRET` with private random strings (see [Configuration](#configuration)). Leave the SQLite `DATABASE_URL` as it is.

4. Generate the Prisma Client, create the database, and load sample data:

   ```bash
   npm run prisma:generate
   npm run prisma:push
   npm run prisma:seed
   ```

   With the template `DATABASE_URL`, the database file is `prisma/dev.db`. The seed script only adds missing sample records, so you can run it again without losing data.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open <http://localhost:3000/absproxy/3000>.

   The app is served under the path prefix `/absproxy/3000` by default because it is deployed behind FITLAB's proxy. To serve it somewhere else, set `BASE_PATH` in `.env` and restart the server. For example, `BASE_PATH=` (empty) would serve it from `http://localhost:3000/`. Pages, API routes, and static assets all use the same prefix.

### Sample account

The seed creates an administrator with username `admin` and password `admin`. Use it for local development only. Change the password after your first sign-in, and never use this account on a shared or production deployment.

## Configuration

Settings live in `.env`. Do not commit this file or any real credentials.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma connection string. The template uses `file:./dev.db` (SQLite). |
| `BASE_PATH` | No | Path prefix for the app. Defaults to `/absproxy/3000`. |
| `QR_JWT_SECRET` | Recommended | Secret that signs the rotating lab QR tokens and individual student QR tokens. The code has a built-in fallback for local development only, so set your own for any shared deployment. |
| `JWT_SECRET` | Recommended | Fallback signing secret for individual QR codes when `QR_JWT_SECRET` is not set. |
| `BREVO_API_KEY` | No | Brevo API key, needed only to email individual QR codes to students. |
| `BREVO_SENDER_EMAIL` | No | Verified Brevo sender address used with the key above. |
| `NODE_ENV` | No | `development` or `production`. Set by `npm run dev` and `npm start`. |

To generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it once per secret so that `JWT_SECRET` and `QR_JWT_SECRET` differ.

## How check-in works

There are two ways for a student to be marked present.

**Barcode scan station.** A staff member signs in and opens the scan station. Student cards are read by a USB barcode scanner (the home page, `/`) or by a webcam (`/scan-station`). The app plays a sound to confirm each scan.

**Mobile QR check-in.** A staff member opens `/qr-station` on a screen in the lab. It shows a QR code that rotates and is signed with `QR_JWT_SECRET`. Students scan it with their phones, which opens `/mobile-checkin`. Students do not need to sign in to the management area. Because the code rotates and expires after 30 seconds, a photo of an old code cannot be reused later. The server does not yet verify that the phone is in the lab.

Staff can also issue an individual QR code to a single student from `/students`, and revoke it at any time.

## Pages

| Path | Purpose |
| --- | --- |
| `/` | Barcode scan station (USB scanner) |
| `/scan-station` | Webcam barcode scan station |
| `/qr-station` | Rotating lab QR display |
| `/mobile-checkin` | Student mobile check-in |
| `/dashboard` | Attendance and lab overview |
| `/schedules` | Student duty schedules |
| `/students` | Student records and individual QR codes |
| `/equipments` | Lab equipment inventory |
| `/incidents` | Equipment incident reports |
| `/users` | Staff account management |
| `/audit-logs` | Administrative activity history |
| `/settings` | Account settings |

Staff pages are guarded in the browser for signed-in administrators and lecturers. See Known limitations for the current state of server-side API protection. Every path above is relative to `BASE_PATH`.

## Commands

```bash
npm run dev               # Start the development server
npm run build             # Build the production app
npm start                 # Serve the production build
npm run lint              # Run Next.js linting
npm run prisma:generate   # Generate Prisma Client
npm run prisma:push       # Sync prisma/schema.prisma to the database
npm run prisma:seed       # Add sample data
```

After you edit `prisma/schema.prisma`, regenerate the client and sync the database:

```bash
npm run prisma:generate
npm run prisma:push
```

## Project layout

```text
app/             Pages and Next.js API route handlers
components/      Shared layout and page components
hooks/           Shared React hooks
lib/             Prisma client, authentication, QR, attendance, and API logic
prisma/          Schema, migrations, and seed script
public/          Logos, images, and scan feedback audio
docs/            QR attendance plan and database/CRUD reference
```

## Troubleshooting

**The page returns 404 at `http://localhost:3000`.** The app is served under `BASE_PATH`, which defaults to `/absproxy/3000`. Open `http://localhost:3000/absproxy/3000`, or change `BASE_PATH` in `.env` and restart.

**Styles, images, or scripts fail to load.** `BASE_PATH` changed after the server started. Stop the server and run `npm run dev` again. For a production build, run `npm run build` again after changing it.

**Prisma reports that the client is missing or out of date.** Run `npm run prisma:generate`, then restart the server.

**Prisma cannot find the database, or tables are missing.** Check that `DATABASE_URL` in `.env` matches the template, then run `npm run prisma:push`.

**You want a clean database.** Stop the server, delete `prisma/dev.db`, then run `npm run prisma:push` and `npm run prisma:seed`. This removes all existing records.

**Login fails after you change a secret.** Changing `JWT_SECRET` or `QR_JWT_SECRET` invalidates tokens signed with the old value, including individual QR codes you have already issued. Sign in again and reissue the codes.

**The webcam scan station cannot open the camera.** Browsers allow camera access only on `localhost` or over HTTPS, and only after you grant permission. Check the site's camera permission in your browser.

## Deployment notes

- Set private values for `JWT_SECRET` and `QR_JWT_SECRET`, and change the seeded `admin` password or remove that account.
- Set `BASE_PATH` to match the path prefix your host serves the app under.
- Run `npm run build`, then `npm start`.
- SQLite stores everything in one file (`prisma/dev.db` with the template URL). Back that file up regularly, and keep it out of version control.

## Documentation

- [Database ERD and CRUD matrix](docs/DATABASE_ERD_CRUD.md)
- [Dynamic QR attendance plan](docs/KE_HOACH_DIEM_DANH_QR_CODE.md)

## Known limitations

This project is a coursework prototype. The items below describe what the current code does **not** yet do, so that nobody relies on behavior that is not implemented. Read this section before any shared or production deployment.

### Security

- **Server-side authorization is incomplete.** Staff pages are protected in the browser by a route guard, but only some API routes verify the caller on the server (student management, staff accounts, audit logs, profile, and attendance adjustment). The dashboard, schedules, equipment, incident, and attendance scan endpoints do not check who is calling them.
- **The login session is not signed.** The `vlu_user_session` cookie is plain JSON, is readable by browser scripts (`httpOnly` is off), and the server identifies the user from its `username` or `id` fields. `JWT_SECRET` currently protects individual student QR codes only, not staff sessions. Do not expose this build to untrusted networks.
- **Default secrets and account.** `.env.example` contains example values for `JWT_SECRET` and `QR_JWT_SECRET`, and the seed creates `admin` / `admin`. Replace all of them before sharing the app. The server does not refuse to start when the example values are still in use.

### Attendance integrity

- **No location or network check.** The phone sends its GPS coordinates during mobile check-in, but the server does not enforce them. The `allowedIp` field on lab rooms is not used either. As a result, the "stay inside the lab network" protection described in `docs/KE_HOACH_DIEM_DANH_QR_CODE.md` is a plan, not a feature.
- **The rotating QR endpoint is public.** `GET /api/qr/session` can be called without signing in, so a valid token can be obtained from anywhere. Token expiry limits how long a photographed code stays usable, but it does not prove that the student is in the lab.
- **Students are identified by a typed student ID.** Mobile check-in does not verify that the person holds that ID. The one-device-per-student rule relies on an ID stored in the browser (`localStorage`) and can be bypassed by clearing it or using another browser.
- **QR check-ins are not matched to duty schedules.** Each QR check-in creates a new schedule entry on the first shift in the database and is always recorded as `ON_TIME`. The shift's grace period and the `LATE` status are therefore not applied to QR check-ins. The lab is chosen from the QR's lab code and falls back to a default lab if it is not found, so a check-in can be recorded against the wrong lab.

### Documentation and testing

- **Timing values differ between code and plan.** The code issues QR tokens valid for 30 seconds and refreshes the on-screen code every 20 seconds. The plan document still refers to 15 seconds.
- **No automated tests.** Behavior has been checked manually only. There are no unit or integration tests for token signing, attendance rules, or API authorization.

### Deployment

- **SQLite is a single local file.** It suits a lab-sized, single-server deployment but is not intended for many concurrent writers or for running several app instances against one database.
- **Default base path.** The app is served under `/absproxy/3000` unless `BASE_PATH` is changed, because it was built for deployment behind FITLAB's proxy.

### Planned improvements

1. Sign staff sessions with `JWT_SECRET`, set the cookie to `httpOnly`, and require authentication on every staff API route.
2. Restrict `GET /api/qr/session` to the signed-in lab station and enforce the GPS radius or lab network range in `POST /api/qr/verify`.
3. Match QR check-ins to the assigned duty schedule so that `LATE` and `EARLY_LEAVE` are calculated.
4. Align the documented timing values with the code and add tests for `lib/qr-security.ts` and `lib/attendance-rules.ts`.
