# Rafal Storefront Loyalty — MASTER REFERENCE (2026-11-14)

> This is a combined convenience reference for Codex. Other source files are retained for precise targeted reading. **Supplied example responses** and **manually verified Postman observations** are separate sections. Eight original PNGs and selected JSON fixtures are in the same pack.

<!-- SOURCE FILE: README.md -->

# Rafal Storefront — Loyalty Implementation Reference Pack

**Project:** Separate Next.js Storefront repository (NOT Vite Dashboard). **Evidence date:** 2026-11-14. **Status:** Ready for scoped code audit and implementation planning; integration QA not complete.

## Read in this order

1. `00-START-HERE.md` — requirements priority, boundaries and decisions.
2. `01-user-stories-source.md` — **full original user-supplied stories**; preserve acceptance criteria.
3. `03-verified-api-contracts.md` — independently tested Postman observations, actual fields, outcomes.
4. `04-lifecycle-evidence.md` — exact order chronology and unresolved quirks.
5. `05-design-map-and-quality-bar.md` — all image filenames, design interpretation, responsive/a11y/performance expectations.
6. `06-gaps-and-acceptance-checklist.md` — known unknowns, QA priorities and delivery acceptance.
7. `02-provided-api-examples-original.md` — original full user-supplied sample responses (reference, not guaranteed live).
8. `fixtures/` — *selected fields* from real Postman responses for each lifecycle state, not complete responses. See original examples and actual repo for full schemas.

## Authoritative precedence

Current user-confirmed decisions and **actual Postman responses** > user-supplied story descriptions > supplied design screenshot visuals > existing app implementation for established patterns. Conflicts must be highlighted, not silently resolved. Old BRD/PDF and stale Postman collection are **NOT** sources of truth. If any story references BRD, treat that as unresolved cross-reference, not permission to read old BRD.

Screenshots are under `../../../design/loyalty/` relative to repository root if copied as `docs/reference/loyalty` + `design/loyalty`.

No credentials, personal customer identifiers or payment-session URL are included in fixtures.


---

<!-- SOURCE FILE: 00-START-HERE.md -->

# START HERE — Scope, implementation boundaries and proven decisions

## Mission
Build Loyalty into the **separate Next.js Storefront**: Account Points, Checkout Redemption, Order Details loyalty breakdown, Notifications. Reuse current app architecture / components / API client / auth / localization rather than creating a parallel system. Dashboard is a separate repo and feature; dashboard-specific RBAC/permission systems are out of scope.

## Explicit current implementation boundaries
- The complete user-supplied stories are in `01-user-stories-source.md`; exact supplied ACs must be considered, including backend-owned logic (not all backend acceptance criteria turn into frontend tasks).
- Storefront only handles displaying the backend truth, sending `use_points: 0|1`, re-quoting when relevant checkout inputs change, handling loading/empty/errors, and accurate accessible responsive UI.
- Backend owns money, point calculation, tax, concurrency, holds, maturation, refunds, expiry, guest claiming, notifications delivery. Do not replicate as business logic or create client permission guard systems.
- Loyalty points applied are **payment tender, NOT coupon/discount**. Do not recompute VAT or change original gross `money.total` when showing `loyalty.amount_due`.
- Do not infer earned status from order status: `earned_status: null` before confirmation; `pending` at confirmed, processing, shipped, delivered; `cancelled` after full return in tested lifecycle. Only show pending availability date when relevant, even if stale `available_on` persists after return.
- `GET /loyalty.available` may be 100 while `POST /checkout/quote` says `usable:0, disabled_reason:'pending_order'`. Checkout must trust quote `usable`/`disabled_reason`, not account available alone.
- `POST /checkout/quote` and `/checkout/place` both accept `use_points` numeric `0`/`1` as confirmed. One 409 occurred with message `تم تحديث قيمة النقاط، يرجى مراجعة الطلب`; no automatic retry of place. Backend returns `errors.totals` for review; confirm updated quote before resubmitting.
- Order details route/request uses **order_number**, e.g. `RF-10147`, not numeric 147 (exact URL path to discover in app).
- No active access to Figma; design assets are standalone desktop screenshots. They are NOT evidence of mobile designs or comprehensive responsive tokens.
- DO NOT treat any example order/customer/product/currency constants as live defaults.

## Must preserve
- Existing Next.js routing, state ownership, shared layout, query/fetch patterns, i18n RTL/LTR, API error conventions, checkout payment flow, tests.
- No new broad runtime parsing framework, schema library, generic adapters or duplicate data-fetch pipelines. Narrow types and targeted normalization only where actual contract warrants it.
- Minimize API requests, redundant re-renders, dependency bloat, client bundle and cumulative layout shift.

## Cart badge microtask
Implement a small **real cart item count** badge on the shared header cart icon(s). Reuse existing cart state/source and icons; avoid extra requests; determine whether existing cart count means summed quantities or unique lines and document the UX decision. Ensure account/guest flow consistency, initial hydration stability, responsive placement, aria-label semantics, RTL/LTR and zero-count behavior. No new global cart store if an existing source already exists. Isolate task from Loyalty rollout.


---

<!-- SOURCE FILE: 01-user-stories-source.md -->

# Storefront Loyalty — Supplied User Stories (original content)

> Source: user-supplied stories on 2026-11-14. Preserve original acceptance criteria. BRD references inside are historical citations **not authorization to use stale BRD**. Other LOY IDs referenced but not included are NOT fully specified.

Priority: Should-have

Points-based loyalty program: points accrual on purchase, points redemption for discounts, and points balance display in the customer account.

No scope changes in BRD v0.3.

Source: Rafal BRD v0.2/v0.3, Section 10 (EPIC-10: Loyalty Program).

\
\
\
\
**Earn pending points when my order is confirmed**

Description

## As a registered customer, I want points added to my account when my order is confirmed, so that every purchase rewards me.

### 2. Description

Points come from purchases only. At placement the backend calculates the earning base and the points (BR-04, BR-05) and stores them on the order with the rule version. When the order first enters Confirmed, a pending row is posted (BR-06). Pending points cannot be used until they become available (LOY-03).

All payment methods earn. Cash-on-delivery orders earn like the others but their points become available only after the cash is reconciled.

### 3. Preconditions

- The customer was signed in when the order was placed.

* The programme was switched on at placement and the order was placed on or after the launch date (BR-01).

### 4. Main Flow

1. At order placement, the backend calculates the eligible lines, the earning base and the points, and stores on the order: earning base, points, amount per point and rule version. This snapshot is stored for every order, including guest orders (used by LOY-08).

2) When the order first enters Confirmed — directly, or after AwaitingPayment or SyncFailed — the system posts one earn_pending row.

3. The customer's order details show "النقاط المكتسبة: {العدد} نقطة — معلّقة حتى {التاريخ}". Before delivery the date reads "بعد التسليم بـ {الأيام} أيام".

4) The points screen adds the amount to pending points (LOY-06).

5. The dashboard order details show the points earned, their status and the rate used.

### 5. UI Components

**Order details (web and mobile apps)**

| **#** | **Name**                                              | **Type** | **Constraints**                  | **Validations** |
| ----- | ----------------------------------------------------- | -------- | -------------------------------- | --------------- |
| 1     | النقاط المكتسبة: {العدد} نقطة — معلّقة حتى {التاريخ}  | label    | Pending status                   | N/A             |
| 2     | النقاط المكتسبة: {العدد} نقطة — تمت إضافتها إلى رصيدك | label    | Available status (LOY-03)        | N/A             |
| 3     | النقاط المكتسبة: {العدد} نقطة — ملغاة                 | label    | After full cancellation (LOY-04) | N/A             |



**Order details (dashboard)**

| **#** | **Name**             | **Type** | **Constraints**                                                 | **Validations** |
| ----- | -------------------- | -------- | --------------------------------------------------------------- | --------------- |
| 1     | نقاط الولاء المكتسبة | label    | Points, status (معلّقة / متاحة / ملغاة), amount per point used  | N/A             |
| 2     | سجل النقاط           | link     | Opens the customer's points tab filtered to this order (LOY-12) | N/A             |



### 6. Post Conditions

- The order holds its earning snapshot.

* At most one earn_pending row exists per order; no row exists when the points are 0.

### 7. Acceptance Criteria

- **AC-01:** Given the worked example order, when it is confirmed, then one pending row of 32 points is posted.

* **AC-02:** Given an order placed while signed out, when it is confirmed, then no row is posted at confirmation (a claim may follow, LOY-08).

- **AC-03:** Given an order that goes New → SyncFailed → Confirmed, when it reaches Confirmed, then exactly one pending row exists.

* **AC-04:** Given the amount per point changes after placement and before confirmation, when the order is confirmed, then the points use the rate stored at placement.

- **AC-05:** Given an earning base of 8 SAR at 10 SAR per point, when the order is confirmed, then no row is posted and the order details show no points line.

* **AC-06:** Given a cash-on-delivery order, when it is confirmed, then pending points are posted like any other order.

### 8. Alternative Scenarios

- **AS-01 – Order cancelled before Confirmed:** No row is ever posted.

* **AS-02 – Programme switched off after placement:** The snapshot is honoured and the points are posted.

- **AS-03 – Customer blocked after placement:** Points still post and mature; the balance stays frozen (BR-02).

* **AS-04 – Gift order:** The buyer earns; the recipient earns nothing.

\
\
\
\
**My points become available after the return window**

Description

## As a registered customer, I want my pending points to become usable as soon as my order can no longer be returned, so that I can spend them on my next order.

### 2. Description

Points become available only when all conditions in BR-06 hold, so points never pay for an order that is later returned or left unpaid. A scheduled job checks every day, and the related order events trigger an immediate check.

### 3. Preconditions

- The order has a pending row (LOY-02).

### 4. Main Flow

1. The system checks the order's conditions daily at 02:00 Asia/Riyadh [proposed] and immediately on delivery, on a return being resolved and on cash-on-delivery reconciliation.

2) When all conditions hold, the system posts earn_matured: the amount leaves the pending bucket and enters the available bucket as a new lot with its expiry date (BR-11).

3. If the available balance is negative, the credit first covers the deficit (BR-10).

4) The customer is notified (LOY-09) and the order details show "تمت إضافتها إلى رصيدك".

### 5. UI Components

**Order details and points screen**

| **#** | **Name**                                              | **Type**          | **Constraints**                | **Validations** |
| ----- | ----------------------------------------------------- | ----------------- | ------------------------------ | --------------- |
| 1     | النقاط المكتسبة: {العدد} نقطة — تمت إضافتها إلى رصيدك | label             | Replaces the pending line      | N/A             |
| 2     | اكتساب                                                | history row label | Points screen history (LOY-06) | N/A             |



### 6. Post Conditions

- Pending balance decreases and available balance increases by the same amount.

* A lot exists with its expiry date (when validity is enabled).

### 7. Acceptance Criteria

- **AC-01:** Given delivery on 1 Nov 2027 and a 7-day return window, when the job runs on 9 Nov 2027, then the points become available.

* **AC-02:** Given a return request still open when the window ends, when the job runs, then the points stay pending until the return is resolved.

- **AC-03:** Given a delivered cash-on-delivery order not yet reconciled, when the window ends, then the points stay pending; when the cash is reconciled, they become available at once.

* **AC-04:** Given an available balance of −20 and 32 points becoming available, when posted, then the available balance becomes 12.

- **AC-05:** Given 12-month validity, when points become available on 9 Nov 2027, then their lot expires at 23:59 on 9 Nov 2028.

### 8. Alternative Scenarios

- **AS-01 – Return rejected:** The points become available once the window has ended.

* **AS-02 – Partial return refunded before maturity:** The pending amount is reduced first (LOY-04); the remainder becomes available.

- **AS-03 – Account scheduled for deletion:** The points still become available; they are forfeited when the deletion completes.
- **AS-04 – Daily job fails:** The next run processes every overdue order; no order is skipped.

\
\
\
**Redeem my points at checkout**

Description

## As a registered customer, I want to use my points to pay part of my order, so that I save money.

### 2. Description

Points are a payment tender, not a discount (BR-07): they apply after the coupon, shipping, fees and VAT, they do not reduce VAT, and they appear as a payment line. Switching the toggle on applies the highest amount allowed. Applied points are held during checkout (BR-08) so they cannot be spent twice.

### 3. Preconditions

- The customer is signed in and the programme is switched on.

* The usable balance is at or above the minimum and the balance is not negative.

### 4. Main Flow

1. On checkout step 4, the card "استخدام نقاط الولاء" shows "لديك {العدد} نقطة (تعادل {المبلغ} ر.س)".

2) The customer switches the toggle on.

3. The system calculates the points used and the SAR applied (BR-07), holds the points (BR-08) and shows "سيتم استخدام {العدد} نقطة ({المبلغ} ر.س)".

4) The summary adds "مدفوع بالنقاط −{المبلغ} ر.س" below VAT and updates "المبلغ المستحق".

5. If the coupon, shipping method or cart changes, the amount is recalculated within the cap.

6) On "تأكيد الطلب", the backend re-checks the balance, the hold and the rules, places the order and posts a redeem row that consumes lots (BR-11).

7. The order sends the points amount to Odoo as payment method "نقاط الولاء" (BR-13).

8) If the points cover the whole payable total, the payment methods are hidden and the order is placed as paid.

### 5. UI Components

**Checkout step 4**

| **#** | **Name**                                        | **Type**                | **Constraints**                           | **Validations** |
| ----- | ----------------------------------------------- | ----------------------- | ----------------------------------------- | --------------- |
| 1     | استخدام نقاط الولاء                             | card + toggle           | Signed-in customers only                  | N/A             |
| 2     | لديك {العدد} نقطة (تعادل {المبلغ} ر.س)          | label                   | Usable balance (available − held)         | N/A             |
| 3     | سيتم استخدام {العدد} نقطة ({المبلغ} ر.س)        | label                   | Shown when the toggle is on               | N/A             |
| 4     | يمكن استخدام النقاط حتى {النسبة}% من قيمة الطلب | helper text             | From the maximum redemption setting       | N/A             |
| 5     | تحتاج {العدد} نقطة على الأقل لاستخدام النقاط    | label (toggle disabled) | Usable balance below the minimum          | N/A             |
| 6     | رصيد نقاطك غير متاح حالياً                      | label (toggle disabled) | Negative balance                          | N/A             |
| 7     | مدفوع بالنقاط −{المبلغ} ر.س                     | summary line            | Below VAT; never shown as a discount line | N/A             |



**Order details (dashboard)**

| **#** | **Name**      | **Type** | **Constraints**                                      | **Validations** |
| ----- | ------------- | -------- | ---------------------------------------------------- | --------------- |
| 1     | مدفوع بالنقاط | label    | Points used and SAR applied, in the payments section | N/A             |



### 6. Post Conditions

- One redeem row exists for the order, and the hold is cleared.

* The order stores the points used, the SAR applied and the value per point; VAT is unchanged.

### 7. Acceptance Criteria

- **AC-01:** Given 1,000 points and a 500 SAR payable total with a 50% cap, when the toggle is switched on, then 1,000 points (50 SAR) are applied and "المبلغ المستحق" is 450 SAR.

* **AC-02:** Given 10,000 points (500 SAR) and a 300 SAR payable total, when the toggle is switched on, then 3,000 points (150 SAR) are applied.

- **AC-03:** Given points are applied, when the summary shows VAT, then the VAT amount is the same as without points.

* **AC-04:** Given 90 points and a minimum of 100, when checkout loads, then the toggle is disabled with the minimum message.

- **AC-05:** Given points held in a web checkout, when the same customer opens checkout in the app, then the held points are not usable there.

* **AC-06:** Given a failed payment and the customer goes back to the cart, when the cart opens, then the hold is released and no ledger row exists.

- **AC-07:** Given 30 minutes without activity, when the customer returns to checkout, then the hold is released and the toggle is off.

* **AC-08:** Given 250 points at 0.05 SAR per point, when applied to an order above 25 SAR, then 12.50 SAR is applied.

### 8. Alternative Scenarios

- **AS-01 – Rules change during checkout:** The amount is recalculated at placement; if it changes, "تم تحديث قيمة النقاط، يرجى مراجعة الطلب" is shown and the customer confirms again.

* **AS-02 – Points expire during checkout:** Expired points are excluded at placement with the same message.

- **AS-03 – Cash on delivery with points:** The amount collected at the door is "المبلغ المستحق" after points.

* **AS-04 – Programme switched off during checkout:** Redemption is rejected at placement with "برنامج الولاء متوقف حالياً" and the customer confirms the order without points.

\
\
\
**View my points balance and history**

Description

## As a registered customer, I want to see my points, what is pending and how I earned or used them, so that I understand and trust my balance.

### 2. Description

A read-only view of the ledger (BR-03). The "كيف تعمل النقاط" section is built from the current settings (LOY-10), never from fixed text. Old rows keep their original values when the rules change.

### 3. Preconditions

- The customer is signed in.

### 4. Main Flow

1. The customer opens "نقاط الولاء" from the account menu.

2) The balance card shows the available points and their value, the pending points with the next availability date, and the points expiring within the warning period with their date.

3. "كيف تعمل النقاط" lists: amount per point, redemption value, maximum and minimum redemption, when points become available, and validity.

4) The history lists rows newest first: label (Appendix B), date, order number (link), ± points, a "معلّقة" tag on pending rows and the expiry date on credit rows.

5. The customer filters the history by الكل / اكتساب / استبدال / أخرى; 20 rows load per page.

### 5. UI Components

**Points screen**

| **#** | **Name**                                                                                      | **Type**    | **Constraints**                                    | **Validations** |
| ----- | --------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------- | --------------- |
| 1     | {العدد} نقطة — تعادل {المبلغ} ر.س                                                             | label       | Available balance and value                        | N/A             |
| 2     | نقاط معلّقة: {العدد} — متاحة بعد {التاريخ}                                                    | label       | Pending balance; earliest availability date        | N/A             |
| 3     | {العدد} نقطة تنتهي في {التاريخ}                                                               | label       | Shown when points expire within the warning period | N/A             |
| 4     | كيف تعمل النقاط                                                                               | section     | Rendered from settings                             | N/A             |
| 5     | History row                                                                                   | list item   | Label, date, order link, ± points, tags            | N/A             |
| 6     | الكل / اكتساب / استبدال / أخرى                                                                | filter tabs | Default الكل                                       | N/A             |
| 7     | رصيدك سالب بسبب استرجاع طلب؛ لا يترتب عليك أي مبلغ، وسيعود الاستبدال عند تحول الرصيد إلى موجب | banner      | Negative balance                                   | N/A             |
| 8     | برنامج الولاء متوقف مؤقتاً، رصيدك محفوظ                                                       | banner      | Programme switched off                             | N/A             |
| 9     | لا توجد حركات نقاط بعد                                                                        | empty state | No rows                                            | N/A             |



### 6. Post Conditions

- No data changes.

### 7. Acceptance Criteria

- **AC-01:** Given 500 available and 32 pending points, when the screen opens, then both are shown separately with the pending date.

* **AC-02:** Given 500 points at 0.05 SAR per point, when the screen opens, then the value reads "تعادل ٢٥٫٠٠ ر.س".

- **AC-03:** Given the amount per point changes in the dashboard, when the screen opens, then "كيف تعمل النقاط" shows the new value and old rows keep theirs.

* **AC-04:** Given 200 points expiring in 20 days and a 30-day warning period, when the screen opens, then the expiring line shows 200 points and the date.

- **AC-05:** Given a negative balance, when the screen opens, then the negative banner is shown and the balance shows the negative number.

### 8. Alternative Scenarios

- **AS-01 – Programme switched off:** The balance and history stay visible with the paused banner; "كيف تعمل النقاط" is hidden.

* **AS-02 – Screen fails to load:** The standard error state with "إعادة المحاولة" is shown.

\
\
\
**Get warned before my points expire**

Description

As a registered customer, I want to know before my points expire, so that I can use them in time.

### 2. Description

When validity is enabled (LOY-10), each lot expires after the configured number of months (BR-11). Debits use the earliest-expiring lots first. A daily job expires what is left, and the customer receives one warning per expiry date.

### 3. Preconditions

- Points validity is enabled in the settings.

### 4. Main Flow

1. Each lot gets an expiry date when it is created (BR-11).

2) Daily at 00:30 Asia/Riyadh [proposed], the system posts an expire row for the remaining points of every lot past its expiry date.

3. Daily at 10:00 Asia/Riyadh [proposed], the system finds lots that expire within the warning period and have not been warned, and sends one notification per customer per expiry date (LOY-09).

4) The points screen shows the next expiring amount (LOY-06).

### 5. UI Components

**Points screen**

| **#** | **Name**           | **Type**          | **Constraints**                    | **Validations** |
| ----- | ------------------ | ----------------- | ---------------------------------- | --------------- |
| 1     | انتهاء صلاحية      | history row label | Expire rows                        | N/A             |
| 2     | تنتهي في {التاريخ} | row detail        | On credit rows with an expiry date | N/A             |



### 6. Post Conditions

- Expired points are removed from the available balance; each warned lot is marked as warned.

### 7. Acceptance Criteria

- **AC-01:** Given a 100-point lot credited on 10 Jan 2027 with 12-month validity, when the job runs at 00:30 on 11 Jan 2028, then an expire row removes whatever remains of it.

* **AC-02:** Given lot A (100 points, expiring in March) and lot B (100 points, expiring in June), when 150 points are redeemed, then lot A is fully used and 50 points remain in lot B.

- **AC-03:** Given a lot expiring in 30 days and a 30-day warning period, when the warning job runs, then one notification is sent and it is not repeated for that lot.

* **AC-04:** Given validity changes from 12 to 6 months, when new points become available, then their lots get 6 months and older lots keep their dates.

- **AC-05:** Given validity is set to "لا تنتهي", when points become available, then their lot has no expiry date.

### 8. Alternative Scenarios

- **AS-01 – Points held in an open checkout expire:** They are excluded at placement (LOY-05).

* **AS-02 – Negative balance:** There are no lots left to expire; nothing is posted.

- **AS-03 – Points returned from a cancellation:** They form a new lot dated on the return (BR-11).

\
\
\
**Receive loyalty notifications**

Description

## As a registered customer, I want to be told when my points change, so that I always know what I have.

### 2. Description

Loyalty notifications are account messages about the customer's balance; they are sent whatever the marketing consent (Appendix C, A3). They appear in the notification centre on web and apps and as push on the apps. The wording of each message is edited from the existing notification templates screen, which gains the nine templates below.

The points expected from an order are not a separate notification; the order confirmation message gains the line "ستكسب {العدد} نقطة من هذا الطلب".

### 3. Preconditions

- The customer has a registered account.

### 4. Main Flow

1. A loyalty event occurs (table below).

2) The system fills the event's template and sends it on the listed channels.

3. Several events of the same type produced by one job run are merged into one message with the total.

4) Push messages due between 22:00 and 09:00 Asia/Riyadh [proposed] are delivered at 09:00; in-app messages are delivered at once.

5. Tapping a message opens the listed screen.

### 5. UI Components

**Notification events**

| **#** | **Event**                      | **Trigger**         | **Channels** | **Message**                                                      | **Opens**     |
| ----- | ------------------------------ | ------------------- | ------------ | ---------------------------------------------------------------- | ------------- |
| 1     | Points available               | LOY-03              | In-app, push | أصبحت {العدد} نقطة متاحة في رصيدك                                | Points screen |
| 2     | Expiring soon                  | LOY-07              | In-app, push | تنتهي صلاحية {العدد} نقطة في {التاريخ}، استخدمها قبل انتهائها    | Points screen |
| 3     | Points expired                 | LOY-07              | In-app       | انتهت صلاحية {العدد} نقطة من رصيدك                               | Points screen |
| 4     | Points returned                | LOY-04              | In-app, push | تمت إعادة {العدد} نقطة إلى رصيدك من الطلب {رقم_الطلب}            | Order details |
| 5     | Points reversed or clawed back | LOY-04              | In-app       | تم خصم {العدد} نقطة بسبب استرجاع منتجات من الطلب {رقم_الطلب}     | Order details |
| 6     | Manual adjustment              | LOY-12, if opted in | In-app, push | تم تعديل رصيد نقاطك بـ {العدد} نقطة                              | Points screen |
| 7     | Bulk grant                     | LOY-13, if opted in | In-app, push | Text set in the grant; default: تمت إضافة {العدد} نقطة إلى رصيدك | Points screen |
| 8     | Salla balance transferred      | LOY-14              | In-app, push | تم نقل رصيد نقاطك من المتجر السابق: {العدد} نقطة                 | Points screen |
| 9     | Guest orders claimed           | LOY-08              | In-app, push | تمت إضافة نقاط {عدد_الطلبات} من طلباتك السابقة إلى رصيدك         | Points screen |



### 6. Post Conditions

- Each sent message is logged with event, customer, channel, template version and delivery status.

### 7. Acceptance Criteria

- **AC-01:** Given three orders become available in the same job run, when notifications are sent, then the customer receives one push with the total points.

* **AC-02:** Given push notifications are disabled on the device, when an event occurs, then the in-app notification still appears.

- **AC-03:** Given a template edited in the dashboard, when the next event occurs, then the new wording is used.

* **AC-04:** Given an expiring-soon push due at 23:00, when sent, then it is delivered at 09:00 the next morning.

- **AC-05:** Given the customer has switched off marketing messages, when points become available, then the notification is still sent.

### 8. Alternative Scenarios

- **AS-01 – Target screen unavailable:** The message opens the points screen.

* **AS-02 – Customer signed out on the device:** Tapping opens sign-in, then the target screen.

\
\
\
\


---

<!-- SOURCE FILE: 02-provided-api-examples-original.md -->

# Initial API descriptions and sample responses — user supplied

> These are the originally supplied examples, NOT automatically verified live contracts. See 03 for actual Postman evidence. Sensitive customer examples may be present: do not share externally.

ارفقت لك كل ال avaible user stories المتاحة معايا \
\
و حاليا هرفق لك كل ال avaible endpoints المتاحة معايا ايضا \
\
get points endpoint \
GET\
/loyalty \
\
response : \
{

  "success": true,

  "message": "Loyalty points retrieved successfully",

  "data": {

    "available": 5127,

    "value_sar": "256.35",

    "pending": 0,

    "pending_available_on": null,

    "expiring_soon": {

      "points": 100,

      "expires_at": "2026-11-21T21:29:08+03:00"

    },

    "is_negative": false,

    "is_paused": false,

    "how_it_works": {

      "amount_per_point": "11.00",

      "redeem_points": 100,

      "redeem_amount": "5.00",

      "max_redeem_percent": 50,

      "min_redeem_points": 100,

      "return_window_days": 14,

      "validity_months": 12

    }

  }

}

\
\
get history endpoint \
GET\
/loyalty/history?type=all \
type enums : all · earn · redeem · other \
response : \
{

  "success": true,

  "message": "Loyalty history retrieved successfully",

  "data": [

    {

      "id": 116,

      "type": "adjust_credit",

      "label": "تعديل يدوي",

      "points": 5000,

      "is_pending": false,

      "expires_at": "2027-11-13T23:59:59+03:00",

      "created_at": "2026-11-13T17:25:44+03:00",

      "order": null

    },

    {

      "id": 101,

      "type": "expire",

      "label": "انتهاء صلاحية",

      "points": -200,

      "is_pending": false,

      "expires_at": null,

      "created_at": "2026-11-11T21:29:08+03:00",

      "order": null

    },

    {

      "id": 100,

      "type": "adjust_credit",

      "label": "تعديل يدوي",

      "points": 100,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:29:07+03:00",

      "order": null

    },

    {

      "id": 99,

      "type": "adjust_credit",

      "label": "تعديل يدوي",

      "points": 200,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:29:07+03:00",

      "order": null

    },

    {

      "id": 98,

      "type": "adjust_credit",

      "label": "تعديل يدوي",

      "points": 50,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:28:55+03:00",

      "order": null

    },

    {

      "id": 97,

      "type": "clawback",

      "label": "خصم نقاط مرتجع",

      "points": -23,

      "is_pending": false,

      "expires_at": null,

      "created_at": "2026-11-11T21:28:55+03:00",

      "order": {

        "id": 426,

        "order_number": "RF-10426"

      }

    },

    {

      "id": 96,

      "type": "adjust_debit",

      "label": "تعديل يدوي",

      "points": -2600,

      "is_pending": false,

      "expires_at": null,

      "created_at": "2026-11-11T21:28:55+03:00",

      "order": null

    },

    {

      "id": 95,

      "type": "earn_matured",

      "label": "اكتساب",

      "points": 23,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:28:47+03:00",

      "order": {

        "id": 426,

        "order_number": "RF-10426"

      }

    },

    {

      "id": 92,

      "type": "redeem_refund",

      "label": "استرجاع نقاط مستبدلة",

      "points": 2587,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:28:32+03:00",

      "order": {

        "id": 425,

        "order_number": "RF-10425"

      }

    },

    {

      "id": 91,

      "type": "clawback",

      "label": "خصم نقاط مرتجع",

      "points": -10,

      "is_pending": false,

      "expires_at": null,

      "created_at": "2026-11-11T21:28:32+03:00",

      "order": {

        "id": 425,

        "order_number": "RF-10425"

      }

    },

    {

      "id": 90,

      "type": "adjust_debit",

      "label": "تعديل يدوي",

      "points": -423,

      "is_pending": false,

      "expires_at": null,

      "created_at": "2026-11-11T21:28:32+03:00",

      "order": {

        "id": 425,

        "order_number": "RF-10425"

      }

    },

    {

      "id": 89,

      "type": "earn_matured",

      "label": "اكتساب",

      "points": 10,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:28:25+03:00",

      "order": {

        "id": 425,

        "order_number": "RF-10425"

      }

    },

    {

      "id": 86,

      "type": "redeem",

      "label": "استبدال",

      "points": -2587,

      "is_pending": false,

      "expires_at": null,

      "created_at": "2026-11-11T21:28:06+03:00",

      "order": {

        "id": 425,

        "order_number": "RF-10425"

      }

    },

    {

      "id": 85,

      "type": "redeem_refund",

      "label": "استرجاع نقاط مستبدلة",

      "points": 2875,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:27:48+03:00",

      "order": {

        "id": 424,

        "order_number": "RF-10424"

      }

    },

    {

      "id": 84,

      "type": "redeem",

      "label": "استبدال",

      "points": -2875,

      "is_pending": false,

      "expires_at": null,

      "created_at": "2026-11-11T21:25:23+03:00",

      "order": {

        "id": 424,

        "order_number": "RF-10424"

      }

    },

    {

      "id": 83,

      "type": "adjust_credit",

      "label": "تعديل يدوي",

      "points": 2000,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:25:02+03:00",

      "order": null

    },

    {

      "id": 82,

      "type": "adjust_credit",

      "label": "تعديل يدوي",

      "points": 1000,

      "is_pending": false,

      "expires_at": "2027-11-11T23:59:59+03:00",

      "created_at": "2026-11-11T21:23:48+03:00",

      "order": null

    }

  ],

  "meta": {

    "current_page": 1,

    "last_page": 1,

    "per_page": 20,

    "total": 17

  }

}

\
\
\
\
حصل تعديل علي ال \
/checkout/quote \
POST\
هنزود key ف ال body \
use_points  = 1| 0\
response : \
{

    "success": true,

    "message": "Quote generated successfully",

    "data": {

        "totals": {

            "lines": [

                {

                    "unit_regular_price": "100.00",

                    "unit_price": "100.00",

                    "discount_per_unit": "0.00",

                    "quantity": 1,

                    "line_subtotal": "100.00",

                    "personalization_fee": "0.00",

                    "line_total": "100.00",

                    "discount_active": false

                }

            ],

            "items_count": 1,

            "lines_count": 1,

            "subtotal": "100.00",

            "product_discount_total": "0.00",

            "personalization_total": "0.00",

            "coupon_discount": "0.00",

            "gift_wrap_fee": "15.00",

            "shipping_fee": "25.00",

            "free_shipping": {

                "enabled": true,

                "threshold": "500.00",

                "qualifies": false,

                "remaining": "400.00"

            },

            "total": "140.00",

            "vat": {

                "rate": "15.00",

                "included_amount": "18.26"

            },

            "currency": "SAR"

        },

        "shipping_options": [

            {

                "id": 1,

                "code": "standard",

                "name": "شحن عادي",

                "eta_label": "٣-٥ أيام عمل",

                "price": "25.00",

                "fee": "25.00",

                "is_free": false,

                "is_pickup": false

            },

            {

                "id": 2,

                "code": "express",

                "name": "شحن سريع",

                "eta_label": "١-٢ يوم عمل",

                "price": "50.00",

                "fee": "50.00",

                "is_free": false,

                "is_pickup": false

            },

            {

                "id": 3,

                "code": "pickup",

                "name": "استلام من الفرع",

                "eta_label": "جاهز خلال ٢٤ ساعة",

                "price": "0.00",

                "fee": "0.00",

                "is_free": true,

                "is_pickup": true

            }

        ],

        "fulfillable": true,

        "warehouse": {

            "id": 7,

            "name": "Madinah Warehouse"

        },

        "unavailable_lines": [],

        "coupon": null,

        "location": {

            "in_coverage": true,

            "city": {

                "id": 1,

                "name": "الرياض"

            }

        }

    }

}

\
\
نفس الكلام ف ال endpoint \
/checkout/place \
POST\
{

    "address": {

        "recipient_name": "API Test",

        "recipient_phone": "0505555555",

        "city_id": 1,

        "district": "Al Olaya",

        "street_details": "King Fahd Rd, Building 12"

    },

    "shipping_method_id": 1,

    "payment_method": "tap",

    "use_points": 0 | 1// new key

}

\
\
response : \
{

    "success": true,

    "message": "Order placed successfully",

    "data": {

        "id": 208,

        "order_number": "RF-10208",

        "display_number": "#RF-10208",

        "status": "confirmed",

        "customer_status": "processing",

        "placed_at": "2026-09-21T18:00:04+00:00",

        "gift": {

            "is_gift": true,

            "is_anonymous": false,

            "gift_message": null

        },

        "shipping_address": {

            "recipient_name": "abdullah",

            "recipient_phone": "01091043660",

            "city": null,

            "district": "5 squar",

            "street_details": "5 home on street 4"

        },

        "shipping_method": {

            "id": 1,

            "code": "standard",

            "name": "شحن عادي"

        },

        "money": {

            "subtotal": "100.00",

            "discount_total": "0.00",

            "shipping_fee": "25.00",

            "personalization_total": "0.00",

            "gift_wrap_fee": "15.00",

            "vat_amount": "18.26",

            "total": "140.00",

            "currency": "SAR"

        },

        "payment": {

            "method": "card",

            "status": "paid",

            "paid_at": "2026-09-21T18:00:04+00:00"

        },

        "timeline": [

            {

                "step": "Confirmed",

                "reached": true

            },

            {

                "step": "Processing",

                "reached": false

            },

            {

                "step": "Shipped",

                "reached": false

            },

            {

                "step": "Delivered",

                "reached": false

            }

        ],

        "can_cancel": true,

        "can_reorder": false

    },

    "meta": {

        "account_prompt": {

            "email": "tet\@test.com",

            "phone": "01091043665",

            "suggest_account": true

        }

    }

}








---

<!-- SOURCE FILE: 03-verified-api-contracts.md -->

# Verified Postman API contracts — 2026-11-14

**Environment:** User-confirmed Test Environment; tested manually in Postman. `HTTP 200` inferred where user stated success for normal endpoints; explicit `409` is observed. Some response fixtures contain **selected verified fields only**, not exact complete responses. Initial sample full payloads are in `02-provided-api-examples-original.md`.

## `GET /loyalty` — read-only account summary (verified)
Wrapper `{success:true,message,data}`. Data fields: `available:number`, `value_sar:string`, `pending:number`, `pending_available_on:string|null`, `expiring_soon:{points:number,expires_at:string}|null`, `is_negative:boolean`, `is_paused:boolean`, `how_it_works:{amount_per_point:string,redeem_points:number,redeem_amount:string,max_redeem_percent:number,min_redeem_points:number,return_window_days:number,validity_months:number|null?}`. `validity_months:null` is a story-level possibility, NOT observed in live tests.

Real example before order: available=100, value_sar='5.00', pending=0; settings: 1 SAR/earned point, 100 points=5 SAR, 50% cap, min=100, 15-day return, validity=3 months. After confirmed payment: available=0, pending=2088, pending_available_on=null. Delivered: pending_available_on='2026-11-29T14:12:51+03:00'. Full return: available=100, pending=0. See `fixtures/loyalty-*.json`.

**Never use summary `available` alone as checkout redeemability**; quote can hold points (`usable:0`). Empty/negative/paused screenshots available, but real responses for those states not tested.

## `GET /loyalty/history?type=all|earn|redeem|other&page=N&per_page=20` (verified)
Wrapper `{success:true,message,data:HistoryEntry[],meta:{current_page,last_page,per_page,total}}`. Rows have `id:number`, `type:string`, `label:string`, `points:signed number`, `is_pending:boolean`, `expires_at:string|null`, `created_at:string`, `order:{id:number,order_number:string}|null`. Observed types: `adjust_credit`, `redeem`, `earn_pending`, `redeem_refund`. Supplied original sample also contains `expire`,`clawback`,`adjust_debit`,`earn_matured`; do not restrict enum to four.

- page=2 while total=1 returned `data:[]`, meta `{current_page:2,last_page:1,per_page:20,total:1}`.
- `type=earn` with only `adjust_credit` returned `[]`, total=0, last_page=1.
- `type=other` returned the `adjust_credit +100` row; total=1.
- Confirmed order history: `earn_pending +2088` and `redeem -100` for RF-10147 plus earlier `adjust_credit +100`.
- After full return: `redeem_refund +100`, `redeem -100`, `adjust_credit +100`; earlier `earn_pending` **no longer surfaced by customer history**. Do not infer physical deletion or fabricate an `earn_cancelled` row.
- Paginate server-side; initial story says 20/page; reset page on filter changes, distinguish empty history (`total=0`) from out-of-range page (`total>0`).

## `POST /checkout/quote` (verified)
Request: existing checkout form-data fields including address, shipping method, city; append `use_points` = numeric 0 or 1 as backend contract. Preserve actual project serialization conventions; do not assume JSON requests if existing client uses FormData.

`data.totals` observed `lines`, `items_count`, `lines_count`, `subtotal`, `product_discount_total`, `personalization_total`, `coupon_discount`, `gift_wrap_fee`, `shipping_fee`, `free_shipping`, `taxable_amount`, `total`, `vat:{rate,amount}`, `loyalty:{available,usable,points_used,amount_applied,amount_due,value_per_point,disabled_reason}`, `amount_due`, `currency`. Other response fields: `shipping_options`, `fulfillable`, `warehouse`, `unavailable_lines`, `coupon`, `location`.

Tested same cart total 2,093 SAR / VAT 273 SAR:

| Scenario | use_points | available | usable | points_used | amount_applied | amount_due | disabled_reason |
|---|---:|---:|---:|---:|---:|---:|---|
| Zero balance | 0 | 0 | 0 | 0 | 0.00 | 2093.00 | `min_not_reached` |
| Zero balance | 1 | 0 | 0 | 0 | 0.00 | 2093.00 | `min_not_reached` |
| Funded 100 points | 1 | 100 | 100 | 100 | 5.00 | 2088.00 | `null` |
| Funded 100 points | 0 | 100 | 100 | 0 | 0.00 | 2093.00 | `null` |
| Pending payment order held | 1 | 100 | 0 | 0 | 0.00 | 2093.00 | `pending_order` |

VAT remained 273 SAR in ON/OFF tested cases; `total` remains 2,093 SAR (before tender); `amount_due` reflects tender. `disabled_reason` known: `null`, `min_not_reached`, `pending_order` only; other enums may exist. Do not fabricate them.

## `POST /checkout/place` (verified)
Body sample `{address:{recipient_name,recipient_phone,city_id,district,street_details},shipping_method_id:2,payment_method:'tap',use_points:1}`. A `409 Conflict` with message `تم تحديث قيمة النقاط، يرجى مراجعة الطلب` and `errors.totals` occurred when prior quote may have been `use_points:0`. After requoting with `use_points:1`, place succeeded. Hypothesis: quote/place state mismatch; NOT a proven mandatory confirmation-token protocol.

Successful response `{success:true,message:'Order created. Complete the payment on the secure payment page.',data:{id:147,order_number:'RF-10147',status:'new',customer_status:'processing',money:{total:'2093.00',...},payment:{method:'tap',status:'pending',paid_at:null},loyalty:{points_earned:2088,earned_status:null,available_on:null,return_window_days:15,points_redeemed:100,amount_applied:'5.00',amount_due:'2088.00',value_per_point:'0.0500',points_returned:0},...},meta:{payment:{payment_url,charge_id,expires_at}}}`. **Credentials/payment URL deliberately redacted.** Navigate to backend-provided payment URL in secure checkout flow; do not expose in logs. Payment succeeded according to subsequent order details despite apparent payment-page failure to user; treat redirect-only success/failure as unreliable pending backend reconciliation.

## Customer order details — uses `order_number` (verified)
Existing endpoint path/method must be discovered in real Storefront repo; user confirmed request identifier `order_number='RF-10147'`. Wrapper `{success:true,message:'Order retrieved successfully',data:{...}}`. Key data: order id and number; status/customer_status; items, address, money/payment/timeline, `can_cancel`, `can_reorder`, `can_request_return`; `loyalty:{points_earned,earned_status,available_on,return_window_days,points_redeemed,amount_applied,amount_due,value_per_point,points_returned}`. See lifecycle file and selected fixtures.

## Notification list — existing route/path to discover (verified empty)
Response `{success:true,message:'Notifications retrieved successfully',data:[],meta:{current_page:1,last_page:1,per_page:15,total:0}}`. **No nonempty notification object observed**, so event type, payload, deep-link, read/unread, templates are NOT verified. Do not invent shape. Story describes 9 loyalty events. Integrate with existing notification architecture after inspecting it.

## Explicit unknowns / no verified contract
Payment hold release on failed/expired payment, concurrent redemption, program paused with live payload, negative points live payload, point maturation after 15 days, partial return, order cancellation, populated notification payload/deep-link, exact 409 re-confirm procedure, non-min redemption constraints and all `disabled_reason` enum values. These belong in QA/backend clarification, not invented frontend logic.


---

<!-- SOURCE FILE: 04-lifecycle-evidence.md -->

# RF-10147 — Verified order / loyalty lifecycle

**Test only, 2026-11-14, all timestamps from the API in +03:00 Asia/Riyadh.** Real Postman responses are user supplied. `fixtures/` stores representative **selected** fields and is not a verbatim full collection.

## Sequence

| Phase | Order status / payment | Loyalty earned status | Balance available | Pending | `available_on` | Ledger consequence |
|---|---|---|---:|---:|---|---|
| Before order | n/a | n/a | 100 | 0 | null | `adjust_credit +100` |
| Place | `new` / `pending` | null | 100 | 0 | null | hold inferred from subsequent `usable=0`; no redeem ledger yet |
| Confirmed | `confirmed` / `paid` | `pending` | 0 | 2088 | null | `earn_pending +2088`, `redeem -100` |
| Processing | `processing` / `paid` | `pending` | 0 | 2088 | null | unchanged |
| Shipped | `shipped` / `paid` | `pending` | 0 | 2088 | null | unchanged |
| Delivered | `delivered` / `paid` | `pending` | 0 | 2088 | 2026-11-29T14:12:51+03:00 | unchanged |
| Returned (full) | `returned` / `paid` | `cancelled` | 100 | 0 | **still populated** (historical) | `redeem_refund +100`; `earn_pending` stops appearing in customer history |

- Created at `2026-11-14T13:44:40+03:00`; payment confirmed `13:54:00`; Processing `14:10:29`; Shipped `14:11:47`; Delivered `14:12:51`; Full returned `14:13:46`.
- At creation checkout quote had 100 points = 5 SAR, gross 2,093, amount due 2,088; place response agreed.
- During pending payment, balance endpoint still said available=100 while subsequent quote said available=100, usable=0, points_used=0 and `disabled_reason='pending_order'`. Evidence of hold exclusion in this scenario; not concurrency proof.
- At confirmed payment, customer order details returned `earned_status='pending'` and `points_earned=2088`. Ledger at 13:54 recorded `earn_pending +2088` and `redeem -100`.
- At Processing and Shipped, no points ledger or balance change.
- Delivered sets exact availability timestamp to 15 days after delivery, leaves points pending.
- Full return restores 100 redeemed points (history `redeem_refund` with expires_at `2027-02-14T23:59:59+03:00`), cancels 2,088 pending points, retains stale order-level `available_on` but global `pending_available_on` becomes null. Renderer must gate date by `earned_status`.
- At Returned, API `customer_status='cancelled'`, order `status='returned'` and all 4 timeline steps `reached=false` in returned response. Avoid claiming status names are synonyms. Design offers separate cancelled/partial-return screenshots, but partial return wasn't verified.
- At Shipped `can_cancel=false`; at Delivered `can_request_return=true`; at Returned false. Continue to use backend-provided flags where already part of current UX.
- A 409 conflict occurred when placing with use_points=1 after a prior quote using 0. Re-quote use_points=1 then place succeeded. Treat as a review/reconfirmation scenario, not automatic retry.
- Payment page appeared to fail to the tester, but Backend showed `paid`; frontend must reconcile server order/payment status, especially after redirect.

## Real contracts vs assumptions
- No earned-points maturity tested: **do NOT display 2088 as available** at delivery.
- No partial return or cancellation tested. No actual negative/paused response tested (only designs).
- User story says earliest-expiring lots used first and redeemed points can return on cancellations; backend owns this.
- Customer history omitted previously visible `earn_pending` after full return; clarify whether this is intentional display filtering or ledger visibility behavior; do not synthesize missing history rows.
- Need backend QA for hold release, guest claim, COD reconciliation, 409 semantics, gift vs buyer, and cases with points value changes.


---

<!-- SOURCE FILE: 05-design-map-and-quality-bar.md -->

# Design screenshots, visual mapping, quality and accessibility

## Source screenshots (pixel dimensions as provided)
All 8 files are user-uploaded **static desktop references**, copied without modification into `design/loyalty/`. **There is no supplied mobile/tablet design**. Do NOT use AI guesses as Figma specs; propose adaptive behavior aligned with existing storefront responsive design system and ask for signoff if choices materially affect UI.

| File | Size | Feature / state |
|---|---|---|
| `checkout.png` | 1440 × 1521 | Checkout RTL: main steps, right summary, loyalty toggle and payment line |
| `notifications-panel.png` | 448 × 580 | Header bell popover: loyalty notifications, rows, timestamp, viewed-style samples |
| `order-in-preparation.png` | 1440 × 1417 | Order details: processing timeline and pending earned points |
| `order-cancelled.png` | 1440 × 1601 | Order details: cancelled tracking, earned reversed, points refund note |
| `order-partially-returned.png` | 1440 × 1657 | Order details: partially returned, item-specific return and loyalty financial effects |
| `loyalty-empty.png` | 1440 × 1473 | Account Points: empty history, zero balance and explanatory rules |
| `loyalty-paused.png` | 1440 × 1907 | Account Points: active balance but programme paused and history filters |
| `loyalty-negative.png` | 1440 × 1744 | Account Points: negative balance warning and transaction rows |

## Map
- Account Loyalty screen: 3 `loyalty-*.png` images, use current account sidebar/layout, header/footer.
- Checkout: `checkout.png` (right sidebar summary with loyalty toggle, VAT and points tender line). **Exact screenshot amount/rule examples are illustrative**; real values always API-driven.
- Order details: 3 `order-*.png` images. Returned state from live API had `status='returned'`, while `order-cancelled.png` depicts cancellation; do not conflate them.
- Notification popover: `notifications-panel.png`, but no populated API notification schema observed. UI not blocked for design analysis; data integration blocked until contract known.

## Pixel fidelity, practical workflow
1. Compare screenshot at its original 1440px desktop viewport, account for browser chrome and system fonts; reuse site tokens/fonts/container/borders/spacing before hardcoding pixels.
2. Identify repeatable primitives from existing app (cards, buttons, typography, inputs, tabs, status labels, skeletons, sidebar, header, footer); do **not** replace shared design system.
3. Record measured layout widths, gaps, alignment, background colors, radius, RTL order and typography after inspecting actual PNGs. Use screenshots as visual target, not as source for data semantics.
4. Screenshots don't prove interactions, hover/focus, mobile stacking, form validation or dynamic sizes. Follow established responsive breakpoints; check at 320/375/390/768/1024/1440px as practical verification samples, not a guarantee for every device.
5. Preserve Arabic RTL and English LTR; include long names, prices, larger text and zoom; avoid clipped controls, horizontal page scroll and icon direction mistakes.
6. Loading states: skeletons matching **the dimensions and layout** of final cards, table rows, sidebar, price summary and order detail, minimizing CLS. Prefer existing skeleton component. Error/empty/paused/negative states differentiated and accessible.
7. Keep a11y: labels for icon-only actions and toggle, semantic headings, keyboard navigation, focus visible, descriptive status updates (`aria-live` where appropriate), touch targets and sufficient contrast. Count badge should be available to screen readers, not icon-only numbers.
8. Avoid extra HTTP requests for badge/loyalty where cache/store already has data. Align quote request ownership with existing checkout state, handle rapid toggles and stale responses, request cancellation / stale-request guard per existing patterns. No extra repeated fetch loops.
9. Use server components where fitting and client components only for true interactions; do NOT migrate existing architecture wholesale. Avoid unnecessary memoization just for style; profile if an actual rerender issue exists.

## Image availability to Codex
Codex **does not see images in this chat automatically**. Copy the whole pack into the local **Storefront repo root**, preserving `design/loyalty/*.png`; ask Codex to inspect those local PNGs using its available image viewing capability. If its runtime cannot view local images, state that blocker, and rely on descriptions + developer visual comparison; do not claim pixel-perfect verification without viewing.


---

<!-- SOURCE FILE: 06-gaps-and-acceptance-checklist.md -->

# Readiness, open questions and staged acceptance checks

## Verified enough to begin feature implementation
- [x] Account balance/settings payload and history structure.
- [x] History `page`/`per_page`, out-of-range handling, `earn` empty and `other` adjustment row.
- [x] Quote with use_points=0/1, available vs usable and `disabled_reason` examples.
- [x] Order place with points (Tap test payment pending then backend paid).
- [x] Order details loyalty object for new, confirmed, processing, shipped, delivered, fully returned.
- [x] Pending points, eligibility date, refund of redeemed points and ledger effects.
- [x] Notification **empty response only**.

## Unverified/needs contract or QA — DO NOT silently invent
- [ ] Notification nonempty item, event payload, deep links, mark-as-read and templates (LOY-09).
- [ ] Partial return, negative balance after clawback, cancellation (LOY-04 referenced but full story not supplied).
- [ ] Point maturity after return window, expiry jobs and warning delivery.
- [ ] Failed payment/expired payment hold release and concurrent redemption protection.
- [ ] What exact steps are required after 409 quote/place mismatch; avoid auto-resubmitting.
- [ ] All supported `disabled_reason` enum cases, programme paused checkout behavior.
- [ ] Guest order claim / COD reconciliation / refund timing, if in Storefront scope and existing flows.
- [ ] Whether `earn_pending` disappearance from customer history after return is intentional.
- [ ] Unbounded validity when `validity_months=null`, guest claim days are backend alignment items, not confirmed live.
- [ ] Actual populated history at >20 rows and multi-page navigation.
- [ ] Responsive source design for tablet/mobile (not supplied).

## Phase acceptance — frontend
### Account Loyalty
- correct balance/pending, signed quantities and SAR formatting, derived copy from `how_it_works`, dynamic paused and negative states, empty history and error/retry.
- correct filter semantics and server-side history page handling; order links use `order_number`, not `id`.
- date/time timezone-aware formatting, RTL/LTR and accessibility; no extra identical requests.

### Checkout
- toggle quote invalidates/requotes based on selected shipping/address/cart/coupon; disabled/rejected states reflect backend; price breakdown uses total/amount_due and VAT without re-calculating.
- async loading/disable confirmation until fresh quote, protect from stale responses; no accidental double place; 409 review updated totals; payment redirect and server status reconciliation.

### Order Details
- order new/pending `earned_status:null` avoids falsely promising pending credit; confirmed/shipped pending text; delivered shows `available_on`; returned/cancelled shows cancelled even if stale `available_on` remains; points redeemed/refunded summary with server fields; partial return deferred unless supported by response.

### Notifications
- integrate into existing bell using supported server payload when confirmed; proper links, empty state, unread and access when logged out; do not fabricate client-only events.

### Shared cart count microtask
- count sourced from shared cart state, no new unnecessary request, handles quantity changes/guest/login/hydration, localizes label, responsive badge placement, accessible for screen readers and not disruptive to header layout; test 0/1/9/10+ counts.

### Engineering release gates
- targeted tests around changed flows; typecheck, lint, build; visual manual review desktop baseline plus varied mobile widths; accessible keyboard checks; defer external backend lifecycle unverified scenarios with clearly named risks. Do not promise 100% on all screen sizes without testing.
