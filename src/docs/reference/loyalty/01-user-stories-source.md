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
