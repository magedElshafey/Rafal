# Rafal Storefront

## Project

Production e-commerce storefront for Rafal.

## Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS v4
- next-intl

## Architecture

- `app/` owns routing and layout composition.
- Business capabilities belong under `features/`.
- Business-agnostic primitives belong under `components/ui/`.
- Cross-shell reusable components belong under `components/shared/`.
- Do not create abstractions or folders speculatively.

See `docs/ARCHITECTURE.md`.

## Next.js rules

- Server Components by default.
- Add `"use client"` only at the lowest interactive boundary.
- Do not make layouts Client Components without a documented reason.

## Styling

See `docs/DESIGN_SYSTEM.md`.

- Do not invent design tokens.
- Prefer semantic design tokens over hard-coded values.
- Follow approved Figma values.

## Internationalization

- Locale routing uses next-intl.
- Arabic is RTL.
- Do not bypass the project's i18n navigation helpers.

## Validation

After code changes run:

- `npm run lint`
- `npm run build`

## Working rules

- Do not change architecture without explaining why.
- Do not install dependencies unless required.
- Do not modify unrelated files.
- Keep changes scoped to the requested task.
