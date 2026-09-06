# PROJECT.md — Rafal Ecommerce Platform

## 1. Purpose

Rafal is a new independent ecommerce platform intended to replace the current Salla-based storefront and provide a foundation that can later expand across Gulf markets.

The platform includes a web storefront, mobile applications, an admin panel, a warehouse panel, and backend/integration services. This repository/document set focuses on the **Next.js web storefront** unless a task explicitly states otherwise.

## 2. Product Context

Rafal sells gifts, jewelry, accessories, and other products. A major product differentiator is the ability to personalize eligible products with a customer-provided name/text.

The new platform must integrate with backend operational systems, including Odoo ERP, payment, shipping, OTP/email services, while keeping the web application independently deployable.

## 3. Delivery Phases

### Phase 1 — MVP

The MVP is production scope, not a prototype. The BRD requires it to be ready for commercial launch at the end of the Phase 1 delivery window.

Relevant storefront/customer capabilities include:

- location/city selection and warehouse-based availability;
- homepage and promotional content;
- category browsing;
- search;
- sorting and filtering;
- product detail pages;
- product variants;
- product personalization;
- cart;
- guest checkout;
- registered-customer checkout;
- gift-recipient flow;
- coupons;
- gift wrapping;
- passwordless email + OTP authentication;
- customer profile and addresses;
- order history/tracking;
- guest order lookup;
- wishlist;
- reviews/ratings;
- static content and blog;
- responsive/mobile-first storefront;
- basic SEO.

### Phase 2

Phase 2 includes capabilities such as loyalty, affiliate marketing, multi-country expansion, advanced marketing and analytics, and broader localization/currency requirements.

Do not implement Phase 2 behavior during Phase 1 unless an approved task explicitly pulls it forward.

## 4. Core Business Rules for the Web Storefront

### Locale and direction
- Phase 1 primary language: Arabic.
- Full RTL layout.
- Multilingual expansion belongs to Phase 2.

### Currency and pricing
- Phase 1 currency: SAR.
- Product prices are shown VAT-inclusive where required by the approved product experience.

### Guest commerce
A guest can:

- browse products;
- add products to cart;
- complete checkout;
- verify email with lightweight OTP during guest checkout;
- track an order using the approved guest-order lookup flow.

Login is not a prerequisite for purchase.

### Authentication
Customer authentication is passwordless:

1. enter email;
2. verify OTP sent by email;
3. existing account → login;
4. new email → collect registration profile data.

Phone number is profile/contact data and is not the primary authentication identity.

### Location and warehouse
The user's selected city/location affects the responsible warehouse and therefore storefront availability.

The UI must treat location as a business-critical state, not a decorative preference.

When a user changes location, affected product availability must be refreshed according to backend rules.

### Product personalization
Eligible products support custom text/name entry.
The selected personalization belongs to the cart/order item, not merely the product definition.

### Gift order vs gift wrapping
These are separate concepts:

- **Send order as a gift:** changes the recipient and shipping destination.
- **Gift wrapping:** paid packaging add-on.

They can coexist on the same order and share the gift-message field where required by the approved flow.

### BNPL on product page
The Phase 1 PDP BNPL area is informational according to the approved scope. Do not build PDP eligibility/API logic for Tabby/Tamara unless scope changes.

## 5. Primary Personas Affecting the Storefront

- Guest shopper
- Registered customer

Administrative roles are handled in admin/warehouse products and their backend authorization model, even though storefront features depend on the data they manage.

## 6. Non-Functional Requirements

The storefront must be designed for:

- responsive, mobile-first behavior;
- Arabic/RTL correctness;
- performance appropriate for ecommerce, with the BRD target of storefront page loads not exceeding 3 seconds under normal conditions;
- secure handling of user/session data;
- basic SEO;
- compatibility with current major browsers;
- future expansion without a Phase 2 rewrite.

Future-ready does **not** mean implementing future scope now. It means avoiding unnecessary hard-coded assumptions where the current architecture already provides a clean abstraction.

## 7. External Systems / Dependencies

The frontend depends on a separate backend and integration layer.

Key external domains include:

- Laravel backend APIs;
- Odoo ERP data synchronization;
- payment gateway;
- shipping provider;
- email OTP service;
- transactional email service.

Provider details may remain TBD until API contracts are delivered.

## 8. Requirement Sources

Authoritative product sources:

- Rafal BRD v0.4 — approved, dated 31 Aug 2026;
- approved CR-01 through CR-04 as incorporated into BRD v0.4;
- approved Rafal Figma web/mobile prototype;
- task-level acceptance criteria.

When requirements are ambiguous, do not invent product behavior. Raise a question.

## 9. Engineering Goal

The codebase should make features easy to understand, test, and change while keeping architecture proportional to the project.

We prefer:

- explicit boundaries;
- typed contracts;
- reusable UI primitives;
- feature-oriented composition;
- server-first rendering where appropriate;
- low client-JS cost;
- no speculative abstraction;
- no dependency added without a real need.
