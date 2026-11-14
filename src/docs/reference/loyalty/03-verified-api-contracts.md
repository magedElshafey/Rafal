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
