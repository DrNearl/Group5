# VLU Barcode Lab Management System

A Next.js web application for managing lab duty schedules, attendance, equipment, and incident reports at Van Lang University. The application uses Tailwind CSS for styling, Prisma ORM for database access, and PostgreSQL for persistent storage.

## Technology stack

- Next.js 14 and React 18
- TypeScript
- Tailwind CSS 3
- Prisma ORM 5
- PostgreSQL 16 (Local FITLAB or Cloud)

## Prerequisites

Install the following before setting up the project:

- Node.js 18 or newer, with npm
- PostgreSQL 16 or newer (cài đặt cục bộ trên FITLAB hoặc dùng PostgreSQL cloud)
- Git

## Get the project

Clone the team repository and move into the project directory:

```bash
git clone https://github.com/DrNearl/Group5.git
cd Group5
```

## Configure environment variables

Create a `.env` file in the project root. Set `DATABASE_URL` to match your local PostgreSQL connection string:

```env
DATABASE_URL="postgresql://coder@localhost:5432/fitlab_db?schema=public"
```

## Install dependencies

From the project root, install the dependencies:

```bash
npm install
```

## Initialize the database

Apply the Prisma schema to the database and load the project seed data:

```bash
npm run prisma:push
npm run prisma:seed
```

The seed script creates initial application data for local development. Review `prisma/seed.ts` for the current seed contents before using them in a shared or production database.

## Run the development server

Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful commands

```bash
npm run build       # Build the production application
npm start           # Serve a production build
npx prisma generate # Regenerate the Prisma Client after schema changes
```

When changing `prisma/schema.prisma`, apply the updated schema and regenerate the client as needed:

```bash
npx prisma db push
npx prisma generate
```
