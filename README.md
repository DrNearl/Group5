# VLU Barcode Lab Management System

A Next.js web application for managing lab duty schedules, attendance, equipment, and incident reports at Van Lang University. The application uses Tailwind CSS for styling, Prisma ORM for database access, and MySQL for persistent storage.

## Technology stack

- Next.js 14 and React 18
- TypeScript
- Tailwind CSS 3
- Prisma ORM 5
- MySQL 8

## Prerequisites

Install the following before setting up the project:

- Node.js 18 or newer, with npm
- MySQL Server 8.0 or newer
- Git

## Get the project

Clone the team repository and move into the project directory:

```bash
git clone https://github.com/DrNearl/Group5.git
cd Group5
```

## Create the database

Start MySQL and connect with a database account that can create databases. Run:

```sql
CREATE DATABASE IF NOT EXISTS vlu_barcode_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Configure environment variables

Create a `.env` file in the project root. Set `DATABASE_URL` to match your local MySQL username, password, host, port, and database:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/vlu_barcode_lab"
```

Replace `USER` and `PASSWORD` with your MySQL credentials. If your password contains reserved URL characters, URL-encode those characters. Keep `.env` private and do not commit credentials to the repository.

## Install dependencies

From the project root, install the dependencies:

```bash
npm install
```

## Initialize the database

Apply the Prisma schema to the database and load the project seed data:

```bash
npx prisma db push
npx prisma db seed
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
