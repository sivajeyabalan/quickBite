

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
