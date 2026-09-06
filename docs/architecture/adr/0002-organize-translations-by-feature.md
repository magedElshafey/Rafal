# ADR-0002: Organize Translation Messages by Locale and Feature

- Status: Accepted
- Date: 2026-09-05

## Context

Rafal contains multiple independent application domains and features such as:

- home
- catalog
- search
- product
- cart
- checkout
- authentication
- account
- orders
- wishlist
- reviews

Keeping all translations for each locale inside a single large file such as:

```text
src/messages/
├── ar.json
└── en.json
```
