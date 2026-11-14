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






