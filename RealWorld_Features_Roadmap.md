## Post-Deployment Manual Testing Checklist (A → Z)

Use this as a release checklist in production/staging.

- **A — Authentication**
  - Register, login, logout, refresh-token/session persistence.
  - Invalid credentials and locked/disabled user behavior.

- **B — Role-Based Access**
  - `CUSTOMER`, `STAFF`, `ADMIN` see correct pages.
  - Direct URL access blocked/redirected correctly (especially `/`, `/orders`, `/kitchen`, `/admin`).

- **C — Cart**
  - Add/remove/update quantity, customizations, totals.
  - Cart persistence across refresh/login.

- **D — Dine-In Flow**
  - Place dine-in order with new simplified message (“staff will assign table”).
  - Ensure no old table-assignment UI/routes appear.

- **E — Error Handling**
  - API failures show user-friendly toasts/messages.
  - No white-screen/uncaught errors in console.

- **F — Filters & Search**
  - Kitchen tab filters (All/Fine Dine/Pickup/Delivery).
  - Admin order filters incl. refund-related filters.

- **G — Gateway/WebSocket Events**
  - Real-time updates for new order, status updates, payment updates, refund updates.
  - No manual refresh required for critical status badges.

- **H — Header/Nav**
  - Navbar links per role are correct.
  - Badge counts update and clear correctly (cart, refund-pending indicator).

- **I — Input Validation**
  - Phone/pincode reject alphabetic input.
  - Required fields, boundaries, and format validation.

- **J — Journey Continuity**
  - End-to-end customer journey from menu to order tracking.
  - Re-login resumes expected state.

- **K — Kitchen Board**
  - Status transitions forward/backward work.
  - Cards move columns correctly.
  - “Collect Payment”, “Paid”, “Refund Pending”, “Refunded” tags show correctly.

- **L — Loading States**
  - Spinners/skeletons appear during fetch/mutations.
  - Buttons disable during API actions to avoid double-submit.

- **M — Menu Management**
  - Admin CRUD for categories/items/modifiers.
  - Customer menu reflects latest changes quickly.

- **N — Notifications**
  - Toasts for key actions (new order, status updated, payment success/fail, refund actions).
  - No duplicate or stale notifications.

- **O — Orders (Customer)**
  - Place order for Delivery/Pickup/Dine-in.
  - Order list and order details (`/orders/:id`) stay in sync.

- **P — Payments**
  - Cash flow: not auto-paid; shows pending collect behavior.
  - Card/Stripe flow: success, failure, cancellation, retry.
  - Payment status reflected in all role UIs.

- **Q — Query/Cache Consistency**
  - After updates, list/detail views stay consistent.
  - No stale badges after approve-refund.

- **R — Refund Lifecycle**
  - Paid order cancellation marks `REFUND_PENDING`.
  - Admin can approve refund quickly from orders list.
  - Post-approve: status becomes `REFUNDED`, pending counts disappear instantly.
  - Idempotency: second approval does not double-refund.

- **S — Security**
  - Protected endpoints reject unauthorized roles.
  - JWT expiry behavior and forced redirects verified.

- **T — Time/Timers**
  - “Xm ago” and ordering of kitchen cards (FIFO) correct.
  - Polling fallback works if socket temporarily disconnects.

- **U — URL/Route Behavior**
  - Unknown route redirect per role works.
  - Staff hitting root goes to `/kitchen`; admin to `/admin`; customer to `/`.

- **V — Version/Env**
  - Correct deployed `VITE_API_URL` and backend envs.
  - Stripe publishable/secret keys point to correct environment.

- **W — Webhooks (Stripe)**
  - Payment confirmation webhooks update order/payment states.
  - Late/out-of-order webhook does not break cancelled/refund states.

- **X — Cross-Browser/Device**
  - Chrome/Edge/Safari/Firefox basic pass.
  - Mobile responsive checks for checkout, tracking, kitchen/admin essentials.

- **Y — Yield/Performance Smoke**
  - High-level responsiveness with multiple concurrent orders.
  - No severe lag in kitchen/admin real-time screens.

- **Z — Zero-Downtime/Regression Smoke**
  - Fresh deploy sanity: login, place order, status update, pay, cancel, refund approve.
  - Verify logs/monitoring show no critical errors after release.

---

If you want, I can convert this into a **printable QA template** with `Pass/Fail/Notes` columns and priority (`P0/P1/P2`) for your team.## Post-Deployment Manual Testing Checklist (A → Z)

Use this as a release checklist in production/staging.

- **A — Authentication**
  - Register, login, logout, refresh-token/session persistence.
  - Invalid credentials and locked/disabled user behavior.

- **B — Role-Based Access**
  - `CUSTOMER`, `STAFF`, `ADMIN` see correct pages.
  - Direct URL access blocked/redirected correctly (especially `/`, `/orders`, `/kitchen`, `/admin`).

- **C — Cart**
  - Add/remove/update quantity, customizations, totals.
  - Cart persistence across refresh/login.

- **D — Dine-In Flow**
  - Place dine-in order with new simplified message (“staff will assign table”).
  - Ensure no old table-assignment UI/routes appear.

- **E — Error Handling**
  - API failures show user-friendly toasts/messages.
  - No white-screen/uncaught errors in console.

- **F — Filters & Search**
  - Kitchen tab filters (All/Fine Dine/Pickup/Delivery).
  - Admin order filters incl. refund-related filters.

- **G — Gateway/WebSocket Events**
  - Real-time updates for new order, status updates, payment updates, refund updates.
  - No manual refresh required for critical status badges.

- **H — Header/Nav**
  - Navbar links per role are correct.
  - Badge counts update and clear correctly (cart, refund-pending indicator).

- **I — Input Validation**
  - Phone/pincode reject alphabetic input.
  - Required fields, boundaries, and format validation.

- **J — Journey Continuity**
  - End-to-end customer journey from menu to order tracking.
  - Re-login resumes expected state.

- **K — Kitchen Board**
  - Status transitions forward/backward work.
  - Cards move columns correctly.
  - “Collect Payment”, “Paid”, “Refund Pending”, “Refunded” tags show correctly.

- **L — Loading States**
  - Spinners/skeletons appear during fetch/mutations.
  - Buttons disable during API actions to avoid double-submit.

- **M — Menu Management**
  - Admin CRUD for categories/items/modifiers.
  - Customer menu reflects latest changes quickly.

- **N — Notifications**
  - Toasts for key actions (new order, status updated, payment success/fail, refund actions).
  - No duplicate or stale notifications.

- **O — Orders (Customer)**
  - Place order for Delivery/Pickup/Dine-in.
  - Order list and order details (`/orders/:id`) stay in sync.

- **P — Payments**
  - Cash flow: not auto-paid; shows pending collect behavior.
  - Card/Stripe flow: success, failure, cancellation, retry.
  - Payment status reflected in all role UIs.

- **Q — Query/Cache Consistency**
  - After updates, list/detail views stay consistent.
  - No stale badges after approve-refund.

- **R — Refund Lifecycle**
  - Paid order cancellation marks `REFUND_PENDING`.
  - Admin can approve refund quickly from orders list.
  - Post-approve: status becomes `REFUNDED`, pending counts disappear instantly.
  - Idempotency: second approval does not double-refund.

- **S — Security**
  - Protected endpoints reject unauthorized roles.
  - JWT expiry behavior and forced redirects verified.

- **T — Time/Timers**
  - “Xm ago” and ordering of kitchen cards (FIFO) correct.
  - Polling fallback works if socket temporarily disconnects.

- **U — URL/Route Behavior**
  - Unknown route redirect per role works.
  - Staff hitting root goes to `/kitchen`; admin to `/admin`; customer to `/`.

- **V — Version/Env**
  - Correct deployed `VITE_API_URL` and backend envs.
  - Stripe publishable/secret keys point to correct environment.

- **W — Webhooks (Stripe)**
  - Payment confirmation webhooks update order/payment states.
  - Late/out-of-order webhook does not break cancelled/refund states.

- **X — Cross-Browser/Device**
  - Chrome/Edge/Safari/Firefox basic pass.
  - Mobile responsive checks for checkout, tracking, kitchen/admin essentials.

- **Y — Yield/Performance Smoke**
  - High-level responsiveness with multiple concurrent orders.
  - No severe lag in kitchen/admin real-time screens.

- **Z — Zero-Downtime/Regression Smoke**
  - Fresh deploy sanity: login, place order, status update, pay, cancel, refund approve.
  - Verify logs/monitoring show no critical errors after release.

---

If you want, I can convert this into a **printable QA template** with `Pass/Fail/Notes` columns and priority (`P0/P1/P2`) for your team.

# QuickBite — Real-World Feature Roadmap (No Fluff)

This is a practical roadmap for turning QuickBite from MVP into a production-grade restaurant platform.

## Priority 0 (Ship Next) — Revenue + Ops Safety
**REDO ING STATE LIKE ACCIDENTLY STATE FROM READY NEED TO CHANGE AGAIN TO PREPARING 
 AND DINE IN , PICKUP , DELIVERY OPTIONS**
### 1) Stock & Availability Guardrails
**Why it matters:** Stops orders for items you can’t serve.

**Build:**
- Add `stockQty`, `is86d` (temporarily unavailable), and optional `availableFrom/availableTo` on menu items.
- Block checkout if any item becomes unavailable before payment confirmation.
- Auto-mark item unavailable at `stockQty = 0`.
- Kitchen/staff quick toggle for “86 item”.

**Done when:**
- Customer cannot pay for unavailable items.
- Staff can disable/enable item in <2 clicks.

### 2) Order Acceptance SLA + Auto-Cancel Window
**Why it matters:** Prevents customer uncertainty and keeps queue clean.

**Build:**
- Add acceptance timer (e.g., 5 min) on `PENDING` orders.
- If not confirmed by staff in SLA window, auto-cancel and notify customer.
- Log reason (`AUTO_TIMEOUT`) for analytics/support.

**Done when:**
- Expired pending orders cancel automatically with notification.

### 3) Payment Reliability (Idempotency + Recovery)
**Why it matters:** Prevents double charges and “paid but not confirmed” incidents.

**Build:**
- Add idempotency keys for `create payment intent` and order placement.
- Add “reconcile payment” scheduled job for stuck `PENDING` intents.
- Store webhook event IDs to prevent duplicate processing.
- Add admin “force reconcile” action by `orderNumber`.

**Done when:**
- Duplicate webhooks/requests do not create duplicate payments/orders.

### 4) Kitchen Load Management
**Why it matters:** Kitchen needs predictable throughput at peak hours.

**Build:**
- Add prep-time estimate per order and dynamic queue ETA.
- Cap simultaneous active orders by station/overall limit.
- Show “throttle mode” banner on customer UI when overloaded.

**Done when:**
- ETA updates reflect queue state.
- Overload protection prevents new paid orders from overfilling queue.

---

## Priority 1 — Customer Experience That Reduces Support Tickets

### 5) Notification System (Push/SMS/Email)
**Why it matters:** Users stop refreshing and support calls drop.

**Build:**
- Event-driven notifications for `CONFIRMED`, `READY`, `CANCELLED`.
- Customer notification preferences in profile.
- Retry + dead-letter queue for failed sends.

### 6) Proper Refund Flow
**Why it matters:** Required for trust and payment compliance.

**Build:**
- Stripe refund endpoint + partial/full refund support.
- Refund reason codes (`OUT_OF_STOCK`, `CUSTOMER_REQUEST`, `OPS_ERROR`).
- Refund status timeline shown on order tracking.

### 7) Promo/Discount Engine (Simple but Safe)
**Why it matters:** Needed for growth campaigns.

**Build:**
- Coupons: fixed/percentage, validity window, usage limits, min spend.
- One coupon per order at launch.
- Server-side price calculation only.

### 8) Better Reorder
**Why it matters:** Increases repeat conversion.

**Build:**
- “Reorder as new cart” with out-of-stock substitution prompts.
- Save favorites and “last 3 orders” quick actions.

---

## Priority 2 — Admin & Business Intelligence

### 9) Real Analytics Backend (Not UI-only)
**Why it matters:** Owners need true business metrics.

**Build:**
- API endpoints for revenue, AOV, conversion, cancellation/refund rates.
- Time filters: today, last 7/30 days, custom range.
- Separate paid vs unpaid/cancelled revenue.

### 10) Audit Trail + Action History
**Why it matters:** Critical for disputes and operational accountability.

**Build:**
- Track status changes with actor, role, timestamp, source (webhook/manual).
- Record admin changes to menu, pricing, user roles.

### 11) Multi-Store / Branch Support
**Why it matters:** Real businesses expand.

**Build:**
- Add `storeId` scoping to menu, orders, users, analytics.
- Role scope by store (staff should not manage all branches by default).

---

## Priority 3 — Security, Reliability, Compliance

### 12) RBAC Hardening + Permission Matrix
**Why it matters:** Prevents privilege mistakes in production.

**Build:**
- Move from role-only checks to permission-based guards where needed.
- Explicit policy matrix for sensitive actions (refunds, user role changes).

### 13) Observability Baseline
**Why it matters:** You can’t fix what you can’t see.

**Build:**
- Structured logs with request ID and order/payment correlation IDs.
- Error tracking + performance monitoring dashboard.
- Alerts: webhook failure rate, payment reconciliation failures, queue latency.

### 14) Data Retention + Privacy Controls
**Why it matters:** Needed as volume and legal exposure grow.

**Build:**
- PII retention policy and soft-delete/anonymize user data pipeline.
- Export customer order history on request.

---

## Minimal Data Model Additions

- `Order`: `cancelReason`, `cancelledBy`, `acceptedAt`, `etaMinutes`, `storeId`
- `Payment`: `idempotencyKey`, `providerEventId`, `refundAmount`, `refundStatus`
- `MenuItem`: `stockQty`, `is86d`, `availableFrom`, `availableTo`, `storeId`
- `OrderStatusHistory`: orderId, fromStatus, toStatus, actorId, actorRole, source, timestamp

---

## Suggested Implementation Sequence (8 Weeks)

### Week 1–2
- Stock guardrails
- Pending SLA auto-cancel
- Idempotency for payment intent + order create

### Week 3–4
- Webhook dedupe + reconciliation job
- Refund flow (basic full refund first)
- Status history table + writes

### Week 5–6
- Notification service (start with email/push)
- Analytics backend endpoints

### Week 7–8
- Kitchen load throttling + ETA
- Admin tools for reconciliation/refunds
- Alerting and dashboards

---

## What Not to Build Yet

- Loyalty points system
- AI recommendations
- Social feed/reviews
- Over-designed theming

These can wait until core reliability, payments, and operations are solid.

---

## One-Line Rule

If a feature does not improve **order success rate, kitchen throughput, payment reliability, or support load**, it is not next priority.
