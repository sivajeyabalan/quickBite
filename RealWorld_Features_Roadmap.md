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
