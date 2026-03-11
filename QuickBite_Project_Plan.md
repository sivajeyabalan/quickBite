|  |
| --- |
| **🍽 QuickBite**  Mini Dine-In / Kiosk / Order App  **Full Stack Project Plan · Day 19–20** |

# **1. Project Overview**

QuickBite is a full-stack restaurant ordering platform that supports three modes of operation: a customer-facing dine-in kiosk (tablet/browser), a mobile/web order app for self-service ordering, and a staff dashboard for managing orders and menus. The system demonstrates production-grade architecture covering React UI, NestJS REST APIs, JWT authentication, PostgreSQL persistence, and clean monorepo folder structure.

|  |  |  |
| --- | --- | --- |
| **👤 Customer Kiosk**  Browse menu, customise, order & pay | **🧑‍🍳 Kitchen Display**  Live queue of incoming orders | **🛠 Admin Dashboard**  Menu CRUD, analytics, user mgmt |

# **2. Technology Stack**

|  |  |  |
| --- | --- | --- |
| **Layer** | **Technology** | **Purpose / Notes** |
| Frontend | React 18 + TypeScript | Vite, React Router v6, Redux |
| Styling | Tailwind CSS + shadcn/ui | Responsive kiosk & mobile layouts |
| State / Data | TanStack Query (React Query) | Server state, caching, optimistic UI |
| Backend | NestJS + TypeScript | Modular monolith, decorators, pipes |
| ORM | Prisma |  schema first approach, migrations |
| Database | PostgreSQL 16 | Relations, JSONB for customisations |
| Auth | JWT (Access + Refresh tokens) | Passport.js strategies, httpOnly cookies |
| Real-time | WebSockets (Socket.io) | Kitchen display live order updates |
| Validation | class-validator + class-transformer | DTO validation pipeline |
| Testing | Jest + Supertest | Unit & e2e API tests |
| Dev Tooling | ESLint, Prettier, Husky | Pre-commit hooks, consistent style |
| Version Control | Git + GitHub | Feature branches, PRs, commit conventions |

# **3. Folder Structure**

Monorepo layout — shared types and constants live in /packages/shared, consumed by both frontend and backend.
```
quickbite/
├── apps/
│   ├── frontend/                  # React app (Vite)
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/        # Reusable UI components
│   │   │   │   ├── ui/            # shadcn base components
│   │   │   │   ├── layout/        # Nav, Sidebar, PageWrapper
│   │   │   │   └── order/         # CartDrawer, ItemCard, etc.
│   │   │   ├── features/          # Feature-sliced modules
│   │   │   │   ├── auth/          # Login, Register, AuthGuard
│   │   │   │   ├── menu/          # Menu browse + item detail
│   │   │   │   ├── cart/          # Cart context + hooks
│   │   │   │   ├── orders/        # Order history, tracking
│   │   │   │   ├── kitchen/       # KDS live feed (WS)
│   │   │   │   └── admin/         # Menu CRUD, analytics
│   │   │   ├── hooks/             # useAuth, useCart, useOrders
│   │   │   ├── lib/               # axios instance, queryClient
│   │   │   ├── pages/             # Route-level page components
│   │   │   ├── store/             # Zustand slices
│   │   │   ├── types/             # Frontend-specific types
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── backend/                   # NestJS app
│       ├── src/
│       │   ├── config/            # ConfigModule, env validation
│       │   ├── common/            # Guards, interceptors, filters
│       │   │   ├── guards/        # JwtAuthGuard, RolesGuard
│       │   │   ├── decorators/    # @CurrentUser, @Roles
│       │   │   ├── filters/       # GlobalExceptionFilter
│       │   │   └── interceptors/  # LoggingInterceptor
│       │   ├── modules/
│       │   │   ├── auth/          # AuthModule, JWT, Passport
│       │   │   ├── users/         # UsersModule, CRUD
│       │   │   ├── menu/          # Categories + MenuItems
│       │   │   ├── orders/        # Orders, OrderItems
│       │   │   ├── payments/      # PaymentRecord entity
│       │   │   └── gateway/       # WebSocket gateway (KDS)
│       │   ├── database/          # TypeORM config, migrations
│       │   └── main.ts
│       ├── test/                  # e2e test specs
│       └── ormconfig.ts
│
└── packages/
    └── shared/                    # Shared types & enums
        ├── src/
        │   ├── dto/               # Shared DTOs (order, menu)
        │   └── enums/             # OrderStatus, UserRole, etc.
        └── package.json
```
# **4. Database Schema**

Six core entities with clear relationships. All entities extend a BaseEntity with id (UUID), createdAt, updatedAt.

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Entity** | **Key Columns** | **Relations** | **Notes** | **API** |
| **users** | email, password\_hash, role (enum), name, phone | HasMany: orders | Roles: customer | staff | admin | /api/users |
| **categories** | name, description, display\_order, is\_active | HasMany: menu\_items | Soft-delete supported | /api/categories |
| **menu\_items** | name, description, price, image\_url, is\_available, prep\_time\_mins | BelongsTo: category HasMany: order\_items | JSONB: customisation\_options | /api/menu |
| **orders** | order\_number (auto), status (enum), table\_number, subtotal, tax, total, notes | BelongsTo: user HasMany: order\_items HasOne: payment | Status flow lifecycle | /api/orders |
| **order\_items** | quantity, unit\_price, customisations (JSONB), item\_name\_snapshot | BelongsTo: order BelongsTo: menu\_item | Snapshot prevents price drift | — |
| **payments** | amount, method (enum), status, transaction\_ref, paid\_at | BelongsTo: order | Methods: cash | card | qr | /api/payments |

**Order Status Flow:**

|  |
| --- |
| **PENDING → CONFIRMED → PREPARING → READY → SERVED → COMPLETED | CANCELLED** |

# **5. API Design**

## **5.1 Auth Module — /api/auth**

|  |  |  |  |
| --- | --- | --- | --- |
| **Method** | **Endpoint** | **Auth** | **Description** |
| **POST** | /api/auth/register | Public | Register new customer. Validates email, hashes password (bcrypt, 12 rounds) |
| **POST** | /api/auth/login | Public | Returns access\_token (15 min) + sets refresh\_token httpOnly cookie |
| **POST** | /api/auth/refresh | Cookie | Issue new access token from valid refresh token |
| **POST** | /api/auth/logout | JWT | Revoke refresh token, clear cookie |
| **GET** | /api/auth/me | JWT | Return current user profile |

## **5.2 Menu Module — /api/menu & /api/categories**

|  |  |  |  |
| --- | --- | --- | --- |
| **Method** | **Endpoint** | **Auth** | **Description** |
| **GET** | /api/menu | Public | List all available items. Query: ?category=&search=&available=true |
| **GET** | /api/menu/:id | Public | Single item detail with customisation\_options |
| **POST** | /api/menu | Admin | Create menu item. Body: CreateMenuItemDto |
| **PATCH** | /api/menu/:id | Admin | Partial update (price, availability, description) |
| **DELETE** | /api/menu/:id | Admin | Soft-delete (sets is\_available=false, keeps order history) |
| **GET** | /api/categories | Public | List categories ordered by display\_order |
| **POST** | /api/categories | Admin | Create category |
| **PATCH** | /api/categories/:id | Admin | Reorder or rename category |

## **5.3 Orders & Payments — /api/orders /api/payments**

|  |  |  |  |
| --- | --- | --- | --- |
| **Method** | **Endpoint** | **Auth** | **Description** |
| **POST** | /api/orders | JWT (Customer) | Place order. Body: CreateOrderDto {items[], table\_number, notes} |
| **GET** | /api/orders | JWT | Customers see own orders; Staff/Admin see all. Query: ?status=&date= |
| **GET** | /api/orders/:id | JWT | Order detail with items & payment status |
| **PATCH** | /api/orders/:id/status | Staff/Admin | Advance order status. Emits WS event to KDS on change |
| **DELETE** | /api/orders/:id | Admin | Cancel order (only if PENDING or CONFIRMED) |
| **POST** | /api/payments | JWT | Record payment. Body: {order\_id, method, amount} |
| **GET** | /api/payments/:orderId | JWT | Payment record for an order |

# **6. Core Feature Modules**

## **6.1 Authentication & Authorisation**

* JWT dual-token strategy: short-lived access token (15 min) + long-lived refresh token (7 days) stored in httpOnly cookie
* Three roles — customer, staff, admin — enforced via @Roles() decorator + RolesGuard
* Password hashing with bcrypt (12 rounds); brute-force protection via throttle guard (5 req/min on auth routes)
* AuthGuard applied globally; public routes whitelisted with @Public() decorator

## **6.2 Menu Browsing (Customer)**

* Category sidebar with sticky nav; filterable item grid with search and dietary tags (vegan, spicy, gluten-free)
* Item detail modal: image, description, price, estimated prep time, and customisation builder (size, extras, remove ingredients)
* Customisations stored as JSONB on order\_items; snapshot of item name & price prevents historical drift
* Skeleton loaders + TanStack Query caching ensure sub-100ms perceived load on re-visits

## **6.3 Cart & Order Placement**

* Persistent cart in Zustand (hydrated from localStorage on mount)
* Cart drawer shows live subtotal, tax (configurable %), and total; supports quantity increment/decrement and item removal
* Order summary screen: review items, enter table number, add order notes, choose payment method
* POST /api/orders on confirm; optimistic UI shows 'Order placed' immediately, rolls back on error

## **6.4 Order Tracking (Customer)**

* Live order status page: polls every 30 s or listens to WS event for own order
* Visual stepper: Pending → Confirmed → Preparing → Ready → Served
* Order history tab: past orders with re-order shortcut (pre-fills cart)

## **6.5 Kitchen Display System — KDS (Staff)**

* Real-time order feed via Socket.io WebSocket gateway
* Cards sorted by order time; colour coding: yellow = new, orange = in progress, green = ready
* Staff can advance status (Confirm → Prepare → Ready) with a single tap per card
* Audio chime on new order receipt (Web Audio API); visual badge on browser tab

## **6.6 Admin Dashboard**

* Menu CRUD: create/edit/delete items and categories with image URL support
* Toggle item availability (e.g. sold out) without deleting — reflects immediately on kiosk via cache invalidation
* Order management table with filter by status, date range, and table number
* Analytics panel: daily revenue, top 5 items by order count, average order value, peak-hour heatmap
* User management: list staff accounts, assign roles, deactivate users

# **7. Day 19 Build Plan — 8-Hour Sprint**

|  |  |  |  |
| --- | --- | --- | --- |
| **Time** | **Block** | **Backend Tasks** | **Frontend Tasks** |
| **08:00–09:30** | 1.5 h Setup | Init NestJS project, install deps (TypeORM, Passport, class-validator), connect PostgreSQL, run first migration | Init Vite+React+TS, install Tailwind + shadcn/ui, set up React Router, axios instance, TanStack Query |
| **09:30–11:00** | 1.5 h Auth | AuthModule: register, login, refresh, logout endpoints; JWT strategy; RolesGuard; bcrypt | Login & Register pages; useAuth hook; AuthGuard wrapper; token storage in memory + refresh logic |
| **11:00–12:30** | 1.5 h Menu | CategoriesModule + MenuModule CRUD; DTOs + validation; seeder script with 20 sample items | Category sidebar; ItemGrid with search/filter; ItemDetailModal with customisation builder |
| **12:30–13:00** | 0.5 h Break | — | — |
| **13:00–14:30** | 1.5 h Orders | OrdersModule: create, list, status update endpoints; order\_number auto-gen; PaymentsModule | Cart Zustand store; CartDrawer; OrderSummary & Confirm screen; POST order flow with error handling |
| **14:30–15:30** | 1.0 h KDS | WebSocket gateway; emit order:new and order:status events; guard for staff role only | KDS page; Socket.io client hook; OrderCard component; status advance buttons; audio chime |
| **15:30–16:30** | 1.0 h Admin | Admin-guarded routes; analytics aggregation queries; toggle availability endpoint | AdminDashboard: MenuCRUD table, OrdersTable, AnalyticsPanel with recharts |
| **16:30–17:30** | 1.0 h Polish | Global exception filter; request logging interceptor; Swagger/OpenAPI annotations | Loading skeletons; error boundaries; responsive breakpoints; empty states |
| **17:30–18:00** | 0.5 h Tests & Git | Jest unit tests for OrdersService; Supertest e2e on POST /api/orders | Final Git clean-up: squash WIP commits, write README, push to GitHub |

# **8. Git Discipline**

## **Branching Strategy**

* main — production-ready, never commit directly
* develop — integration branch; all features merge here first
* feature/<name> — one branch per feature (e.g. feature/auth, feature/menu-crud)
* fix/<name> — bug fix branches

## **Commit Convention (Conventional Commits)**

|  |
| --- |
| feat(auth): add JWT refresh token rotation  feat(menu): implement category filter on menu listing  fix(orders): prevent duplicate order on double-submit  chore: add eslint rule for no-console  test(orders): add e2e spec for POST /api/orders  docs: update README with local setup instructions |

# **9. Day 20 — Evaluation Criteria & Checklist**

|  |  |
| --- | --- |
| **Criterion** | **What evaluators look for** |
| **✔ Code Quality** | Clean, readable TypeScript; consistent naming; no magic strings (use enums/constants); DRY service methods; proper use of NestJS decorators and React hooks |
| **✔ Debugging Skill** | Structured error handling (GlobalExceptionFilter); descriptive error messages; no swallowed errors; console.error only in dev; ability to trace a bug live during review |
| **✔ API Design** | RESTful resource naming; correct HTTP verbs and status codes (201, 400, 401, 403, 404, 409); pagination on list endpoints; consistent response envelope { data, message, statusCode } |
| **✔ Git Discipline** | Meaningful commit history (no 'stuff', 'fix', 'wip' messages); feature branches + PRs; .gitignore covers .env, node\_modules, dist; README has setup + run instructions |
| **✔ Ownership Mindset** | Can explain every line of code; handles edge cases (out-of-stock items, cancelled orders); has thought about future extensibility (e.g. multi-restaurant, discount codes) |

## **Pre-Submission Checklist**

* .env.example committed with all required keys documented
* README.md: project description, prerequisites, setup steps, available scripts, API overview
* Database migrations run cleanly from scratch on a fresh DB
* Seeder script populates at least 3 categories and 12 menu items
* All Swagger/OpenAPI annotations present on controllers
* At least 5 meaningful unit/e2e tests passing
* No hardcoded secrets or API keys in source code
* Build passes (npm run build) for both frontend and backend

# **10. Bonus / Stretch Features**

|  |
| --- |
| **🌟 Stretch Goals (if time allows)**   * QR code generation per table — scan to open kiosk pre-set to that table number * Stripe test-mode integration for card payment simulation * Menu item image upload via Cloudinary (multipart/form-data endpoint) * Discount codes / promotions module with percentage or fixed reduction * Daily revenue chart (recharts AreaChart) on admin dashboard * PWA manifest + service worker so kiosk works offline with cached menu * Docker Compose file for one-command local setup (postgres + backend + frontend) |

|  |
| --- |
| ***Build it like it's going to production.***  React · NestJS · PostgreSQL · JWT · WebSockets · TypeORM · Git |