# FitCheck

FitCheck is a premium editorial fashion store built as a full-stack portfolio application. Its visual direction follows the supplied reference: warm ivory canvas, charcoal typography, restrained rules, and photography-led product layouts.

## Architecture

```text
React + Vite storefront
        ↓ JSON over HTTP (HttpOnly session cookie)
Express REST API
        ↓ validated services
Prisma ORM
        ↓ transactions
PostgreSQL
```

The app is organized as an npm workspace: `client/` contains the browser application and `server/` contains the REST API. The API owns prices, inventory, authorization, cart totals, and order creation. PostgreSQL is the source of truth for accounts, catalog, carts, inventory, and orders.

## Planned capabilities

- Editorial home, searchable/filterable catalog, product detail, and responsive shopping bag.
- Email/password authentication with bcrypt, server-side session persistence, and USER/ADMIN authorization.
- Database-backed cart and transactional checkout with stock validation and inventory updates.
- Account order history and protected administration for catalog and order management.
- Input validation, secure headers, rate limits, accessible states, and reduced-motion support.

## Data model plan

`User` owns sessions, an optional cart, addresses, and orders. `Category` groups `Product` records. Each product owns `ProductVariant` rows for SKU, size/color, price, and stock. `CartItem` references a variant and quantity. `Order` snapshots shipping and totals and owns immutable `OrderItem` price/name/variant snapshots. Foreign keys and indexes support the common catalog, account, and admin queries.

## API plan

| Area | Routes |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Catalog | `GET /api/products`, `GET /api/products/:slug`, `GET /api/categories` |
| Cart | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `DELETE /api/cart` |
| Checkout & account | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id` |
| Admin | Protected product/variant CRUD and order status routes under `/api/admin` |

Exact request and response shapes will be documented alongside their implementation.

## Authentication model

Passwords are hashed with bcryptjs (cost 12). A successful registration or login creates a cryptographically random opaque session token in an HttpOnly, SameSite=Lax cookie. Only its SHA-256 hash and expiry are stored in PostgreSQL. `authenticate` resolves that record on protected requests; `requireRole('ADMIN')` enforces staff access on the server. Logout deletes the active session and clears the cookie. Production cookies are Secure and CORS accepts only the configured client origin.

## Local setup

Requirements: Node.js 20.19+ and PostgreSQL 15+.

1. Copy `.env.example` to `.env` and set a unique `SESSION_SECRET`, database URL, and demo admin credentials.
2. Install dependencies with `npm install`.
3. Start the API and storefront with `npm run dev`.
4. Apply migrations and seed data with the Prisma commands documented as database phases are added.

The API health endpoint is `http://localhost:4000/api/health`; Vite runs at `http://localhost:5173`.

## Deployment

The Vite client can deploy to Vercel, the Express server to Render or Railway, and PostgreSQL to Neon or Supabase. Configure the client URL, API URL, database URL, and session secret in the deployment environment; production cookies must use HTTPS and the frontend origin must be explicitly allowed by CORS.

## Development phases

Implementation follows the supplied incremental plan. Each completed phase is recorded in a meaningful Git commit. The repository starts empty, so phase 1 creates the workspace and architecture baseline; subsequent phases add database, API, and connected storefront functionality.
