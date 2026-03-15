# 🍽 QuickBite

A full-stack restaurant ordering platform supporting dine-in kiosks,
self-service ordering, and real-time kitchen display.

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, TypeScript, Vite          |
| State      | Redux Toolkit, TanStack Query       |
| Styling    | Tailwind CSS                        |
| Backend    | NestJS, TypeScript                  |
| Database   | PostgreSQL 16 + Prisma ORM          |
| Auth       | JWT (Access + Refresh tokens)       |
| Real-time  | WebSockets (Socket.io)              |

## Prerequisites

- Node.js 18+
- PostgreSQL 16
- npm 9+

## Setup

### 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/quickbite.git
cd quickbite

### 2. Backend setup
cd apps/backend
cp .env.example .env
# Fill in your DATABASE_URL and JWT secrets in .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

### 3. Frontend setup
cd apps/frontend
npm install
npm run dev

## Available Scripts

### Backend
| Script                  | Description              |
|-------------------------|--------------------------|
| npm run start:dev       | Start in watch mode      |
| npm run build           | Production build         |
| npm run test            | Run unit tests           |
| npm run test:cov        | Test coverage report     |
| npx prisma studio       | Open Prisma DB GUI       |
| npx prisma db seed      | Seed sample data         |

### Frontend
| Script          | Description         |
|-----------------|---------------------|
| npm run dev     | Start dev server    |
| npm run build   | Production build    |
| npm run preview | Preview build       |

## API Overview

| Module     | Base Path        | Auth          |
|------------|------------------|---------------|
| Auth       | /api/auth        | Public/JWT    |
| Menu       | /api/menu        | Public/Admin  |
| Categories | /api/categories  | Public/Admin  |
| Orders     | /api/orders      | JWT           |
| Payments   | /api/payments    | JWT           |

## User Roles

| Role     | Access                                    |
|----------|-------------------------------------------|
| CUSTOMER | Browse menu, place orders, track orders   |
| STAFF    | Kitchen display, advance order status     |
| ADMIN    | Everything + menu CRUD + analytics        |

## Default Seed Accounts

After running the seeder, use Prisma Studio or register manually.
Change passwords immediately in production.

## Project Structure

quickbite/
├── apps/
│   ├── frontend/     # React + Vite
│   └── backend/      # NestJS
└── packages/
    └── shared/       # Shared types