# Rafal — E-Commerce Storefront for Gifts & Jewelry

<p align="center">
  <strong>A modern customer-facing e-commerce storefront for a Saudi gifts, jewelry, and accessories brand.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Status-In_Development-orange" alt="Status: In Development" />
</p>

---

## Overview

**Rafal** is an independent e-commerce platform currently being developed for a Saudi gifts, jewelry, and accessories brand.

The storefront is built with **Next.js, React, and TypeScript** and is designed to replace a marketplace-style setup with a scalable, brand-owned commerce experience.

The customer experience focuses on product discovery, personalization, gifting, checkout, account flows, order tracking, Arabic-first usability, and warehouse-aware inventory behavior.

---

## Current Product Scope

### Product Discovery

- Homepage merchandising and promotional content
- Categories and product browsing
- Filtering and sorting
- Live search suggestions
- Product detail experiences
- Variant, price, discount, and availability states
- Related product discovery

### Personalization & Gifting

Rafal includes product and gifting workflows tailored to the brand's use case, including:

- Product personalization
- Engraving / name customization
- Sending an order as a gift
- Recipient information
- Gift messages
- Sender-visibility preferences
- Paid gift wrapping

### Cart & Checkout

- Cart management
- Coupon flows
- Guest checkout
- Customer address flows
- Order creation and follow-up

### Customer Experience

- Passwordless email OTP authentication
- Wishlist
- Reviews
- Saved addresses
- Customer orders
- Guest order tracking

### Location & Inventory

The storefront supports location-aware product availability, where city/location selection can influence the relevant warehouse and displayed inventory.

---

## Architecture & Frontend Approach

### Next.js Storefront

The customer-facing application uses **Next.js** with TypeScript to support a modern commerce architecture and scalable page structure.

### Server State

**TanStack Query** is used where client-side server state and asynchronous product data need consistent caching and lifecycle handling.

### Internationalization

The project uses **next-intl** for locale-aware experiences, with Arabic-first product requirements and support for RTL/LTR behavior.

### Design System Foundations

Reusable components and primitives are built with Tailwind CSS and Radix UI-based patterns to maintain consistency across commerce flows.

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| Framework | Next.js 16, React 19 |
| Language | TypeScript |
| Server State | TanStack Query |
| Internationalization | next-intl |
| UI | Tailwind CSS 4, Radix UI |
| Components | class-variance-authority |
| Carousel | Embla Carousel |
| Tooling | ESLint, Next.js tooling |

---

## Planned Integrations

The wider platform roadmap includes integration work for:

- **Odoo ERP**
- Payment services
- Shipping providers
- Email / OTP providers
- Additional commerce services

These integrations are part of the planned platform scope and should not be interpreted as completed functionality unless explicitly marked otherwise.

---

## Future Product Direction

The platform is being designed with room for future expansion such as:

- Multiple countries / stores
- Multiple currencies
- Additional languages
- Multiple warehouse scenarios
- Loyalty and affiliate capabilities
- Analytics and marketing integrations

---

## What This Project Demonstrates

- Next.js + TypeScript commerce development
- Frontend ownership of a complex customer journey
- Product personalization and gifting UX
- Arabic / RTL product requirements
- Warehouse-aware e-commerce behavior
- Reusable component architecture
- Scalable storefront foundations
- Integration-heavy product planning

---

## Project Status

**Currently in development.**

This repository represents the customer-facing storefront of the Rafal commerce platform.

---

## About Me

I'm **Maged Elshafey**, a Frontend Engineer focused on production web applications built with React, TypeScript, and Next.js.

- LinkedIn: https://www.linkedin.com/in/maged-elshafey/
- GitHub: https://github.com/magedElshafey
