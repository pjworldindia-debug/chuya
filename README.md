# CHUYA — Luxury Indian Handbag E-Commerce Platform

A production-ready, full-stack e-commerce monorepo for **CHUYA**, a luxury Indian handbag brand.

## Architecture

```
chuya/
├── apps/
│   ├── storefront/    → Customer-facing React e-commerce (port 3000)
│   ├── admin/         → Owner CMS dashboard (port 3001)
│   └── api/           → Node.js + Express backend (port 4000)
├── packages/
│   └── shared/        → TypeScript types, Zod schemas, Supabase client
├── supabase/
│   └── migrations/    → Full SQL schema with RLS policies
└── pnpm-workspace.yaml
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript (strict) |
| Styling | Tailwind CSS (custom design tokens) |
| State | Zustand (cart, auth), TanStack Query v5 |
| Routing | React Router v6 |
| Database | Supabase (Postgres, Auth, Storage, Realtime) |
| Backend | Node.js + Express |
| Payments | PhonePe Payment Gateway v2 |
| Email | Resend (transactional) |
| Admin UI | Shadcn/UI patterns, TanStack Table, Recharts |
| Forms | React Hook Form + Zod validation |
| Carousel | Swiper.js |
| SEO | react-helmet-async |

## Quick Start

### Prerequisites
- Node.js ≥ 18
- pnpm ≥ 8
- A Supabase project

### 1. Clone & Install
```bash
cd chuya
pnpm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` in each app directory and fill in your values:

```bash
# Storefront & Admin
cp apps/storefront/.env.example apps/storefront/.env
cp apps/admin/.env.example apps/admin/.env

# API Server
cp apps/api/.env.example apps/api/.env
```

### 3. Setup Supabase
Run the SQL migration against your Supabase project:
```bash
# Via Supabase CLI
supabase db push

# Or manually paste supabase/migrations/001_initial_schema.sql
# into the Supabase SQL Editor
```

Create storage buckets in Supabase Dashboard:
- `product-images` — Public, max 5MB, image/* only
- `banner-images` — Public, max 10MB, image/* only

### 4. Run Development
```bash
# All apps simultaneously
pnpm dev

# Or individually
pnpm dev:storefront   # → http://localhost:3000
pnpm dev:admin        # → http://localhost:3001
pnpm dev:api          # → http://localhost:4000
```

### 5. Build for Production
```bash
pnpm build
```

## Storefront Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero carousel, featured products, brand story |
| `/shop` | Collection — filters, sort, infinite scroll |
| `/product/:slug` | Product detail — gallery, add-to-bag, wishlist, accordion |
| `/cart` | Cart & checkout — coupon, address, PhonePe payment |
| `/auth` | Sign in / create account / Google OAuth |
| `/account` | Orders, addresses, wishlist (protected) |
| `/order-success/:id` | Order confirmation + WhatsApp share |

## Admin CMS Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — revenue metrics, charts, low stock alerts |
| `/products` | Product management — table, inline edit, add/edit sheet |
| `/categories` | Category management — sortable list, CRUD |
| `/banners` | Banner management — card grid, active toggle |
| `/orders` | Order management — status updates, expandable details |

## Design System

- **Colors**: Cream `#F8F5F0`, Charcoal `#1A1A1A`, Taupe `#C9B99A`, Muted `#8A8A8A`
- **Typography**: Cormorant Garamond (serif headings), DM Sans (body)
- **Buttons**: All buttons have `border-radius: 0` — no pill buttons
- **Aesthetic**: Quiet luxury — minimal, elegant, generous whitespace

## License

Private — All rights reserved.
