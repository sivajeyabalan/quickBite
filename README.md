# 🍽 QuickBite

QuickBite is a full-stack restaurant ordering platform with customer ordering, live kitchen updates, admin management, and Stripe payments.

## Current Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| UI/State | Tailwind CSS, Redux Toolkit, TanStack Query |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | JWT access/refresh + httpOnly cookie refresh flow |
| Real-time | Socket.io (Kitchen + Payment events) |
| Payments | Stripe (Card + UPI via Payment Element) |
| Media | Cloudinary image upload |

## Project Structure

```
quickBite/
├── backend/
│   ├── src/
│   │   ├── common/
│   │   └── modules/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── categories/
│   │       ├── menu/
│   │       ├── order/
│   │       ├── payment/
│   │       ├── gateway/
│   │       └── prisma/
│   └── prisma/
└── frontend/
    └── src/
    ├── features/
    │   ├── auth/
    │   ├── menu/
    │   ├── cart/
    │   ├── orders/
    │   ├── kitchen/
    │   └── admin/
    ├── components/
    └── api/
```

## Implemented Features

### Backend
- Auth: register, login, refresh, logout, me
- Global guards with role-based access
- Rate limiting via Nest throttler (strict on auth routes)
- Categories CRUD and Menu CRUD (including soft-delete logic)
- Cloudinary upload endpoint for menu images
- Orders create/list/detail/status/cancel
- Payments: cash + Stripe payment intent flow
- Stripe webhook handling + intent sync endpoint
- WebSocket events for order status + payment updates
- Swagger docs and global exception/logging middleware

### Frontend
- Customer menu browsing, item detail, cart, and ordering
- Order tracking page with status stepper
- Payment panel with Stripe Payment Element (Card + UPI)
- Live socket updates for order/payment events
- Admin dashboard with:
    - Analytics
    - Menu CRUD (Cloudinary upload, image preview, search + filters)
    - Orders management table with filters/status actions
    - Users management (list users and update roles)

## Setup

### 1) Backend

```
cd backend
pnpm install
cp .env.example .env
pnpm prisma migrate dev
pnpm seed
pnpm start:dev
```

### 2) Frontend

```
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

## Environment Variables

### backend/.env
- DATABASE_URL
- ACCESS_TOKEN_SECRET
- REFRESH_TOKEN_SECRET
- ACCESS_TOKEN_EXPIRES_IN
- REFRESH_TOKEN_EXPIRES_IN
- THROTTLE_TTL
- THROTTLE_LIMIT
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

### frontend/.env
- VITE_API_URL
- VITE_STRIPE_PUBLISHABLE_KEY

## Scripts

### backend
- pnpm start:dev
- pnpm build
- pnpm start:prod
- pnpm test
- pnpm test:e2e
- pnpm seed

### frontend
- pnpm dev
- pnpm build
- pnpm preview

## API Overview

| Module | Base Path |
|---|---|
| Auth | /api/auth |
| Users (admin) | /api/users |
| Categories | /api/categories |
| Menu | /api/menu |
| Orders | /api/orders |
| Payments | /api/payments |

## Status

Core MVP is implemented and running, including Stripe payment flow, admin user management, API throttling, and Cloudinary upload support.