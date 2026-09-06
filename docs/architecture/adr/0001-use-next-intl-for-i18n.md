# ADR-0001: Use next-intl for Internationalization

- Status: Accepted
- Date: 2026-09-05

## Context

Rafal requires internationalization support with Arabic and English, locale-based routing such as `/ar` and `/en`, RTL/LTR support, localized navigation, and localized metadata.

The project uses Next.js 16 with the App Router.

We considered two main approaches:

1. Custom dictionaries built internally.
2. Using `next-intl`.

A custom implementation could handle basic translations, but Rafal is expected to grow and may require more advanced localization concerns such as routing, navigation, metadata, pluralization, formatting, and additional locales.

Internationalization infrastructure is not a business differentiator for Rafal, so building and maintaining a custom i18n framework would add unnecessary maintenance cost.

## Decision

Use `next-intl` as the internationalization library for the Rafal storefront.

The application will initially support:

- `ar`
- `en`

Routing strategy:

- `/ar/*`
- `/en/*`

Default locale:

- `ar`

Locale prefixes are always present in the URL.

Arabic uses RTL layout direction.

English uses LTR layout direction.

The i18n infrastructure is isolated under:

```text
src/i18n/
├── routing.ts
├── request.ts
└── navigation.ts
```
