# FitCheck

FitCheck is a full-stack fashion storefront with a calm, editorial visual direction: warm ivory, charcoal type, generous whitespace, and photography-led product layouts. The supplied product, catalog, and bag reference informed the design. The app is built as an interview-ready example of how a React storefront connects to authenticated commerce APIs and PostgreSQL.

<!-- Screenshot placeholders: add reviewed captures under docs/images when available. -->
<!-- ![FitCheck home page](docs/images/home.png) -->
<!-- ![FitCheck product page](docs/images/product.png) -->
<!-- ![FitCheck shopping bag](docs/images/bag.png) -->

## Architecture

```text
React + Vite
    │ JSON requests with HttpOnly session cookie
    ▼
Express REST API ── Zod validation / authentication / RBAC
    │ Prisma queries and serializable transactions
    ▼
PostgreSQL
```

This repository is an npm workspace. `client/` contains the Vite/React browser app; `server/` contains the Express API and Prisma schema, migrations, and seed. PostgreSQL owns accounts, catalog, inventory, carts, and orders. The browser never supplies authoritative prices or stock values.

## Features

- Editorial homepage, category navigation, searchable and filterable catalog, product detail, and responsive shopping bag drawer.
- Product variants with size, colour, price, availability, and inventory.
- Registration, sign-in, sign-out, and current-user session endpoints.
- Database-backed carts with server-calculated totals and quantity/stock validation.
- Cash-on-delivery checkout with a PostgreSQL transaction that checks/decrements stock, creates order snapshots, and clears the cart atomically.
- Account order history and owner-scoped order detail.
- Role-protected admin workroom for product creation/editing/visibility, variant pricing/inventory, and order status transitions.
- Loading, error, and empty states; keyboard-accessible controls; responsive layouts; reduced-motion support.
- Seed catalog with 18 products across Women, Men, and Objects, plus an environment-configured admin account.

## Technology

| Area | Stack |
| --- | --- |
| Client | React, Vite, React Router, Tailwind CSS, Framer Motion, Lucide |
| API | Node.js, Express, Zod |
| Data | PostgreSQL, Prisma ORM |
| Auth | bcryptjs and opaque HttpOnly cookie sessions |
| Hosting examples | Vercel client, Render API, Neon/Supabase PostgreSQL |

## Data model

- `User` has a `USER` or `ADMIN` role and owns sessions, a cart, addresses, and orders.
- `Session` stores a SHA-256 hash and expiry for a random session token; the raw token exists only in the HttpOnly cookie.
- `Category` groups published or hidden `Product` records. Products own ordered `ProductImage` rows and `ProductVariant` rows.
- Variants own SKU, size, colour, price in integer minor units, active state, and stock.
- `CartItem` references a variant and quantity. Its price is read from the current variant by the API.
- `Order` snapshots the delivery address and monetary totals. `OrderItem` snapshots the product name, SKU, variant, image, quantity, and unit price at purchase time.

The initial PostgreSQL migration is in `server/prisma/migrations/`. `onDelete` rules preserve order history, cascade ephemeral cart/session data, and restrict deletion of referenced categories and variants.

## Local setup

Requirements: Node.js 20.19+ and PostgreSQL 15+.

1. Create a local PostgreSQL database named `fitcheck` (or choose another name).
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` and replace the demo admin password with a unique password of at least 12 characters.
3. Install workspace dependencies: `npm install`.
4. Generate Prisma Client: `npm run db:generate --workspace server`.
5. Apply migrations: `npm run db:deploy --workspace server`.
6. Create categories, products, variants, and the configured admin account: `npm run db:seed --workspace server`.
7. Start both apps: `npm run dev`.

The storefront runs at `http://localhost:5173`; the API runs at `http://localhost:4000`. Check API/database readiness at `http://localhost:4000/api/health`. Register a customer account through `/register`; use the configured seed credentials for the admin account.

The dependency versions are constrained in workspace manifests. Generate and commit `package-lock.json` with `npm install` before production releases so transitive packages are locked as well.

### Environment variables

| Name | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Server | PostgreSQL connection string |
| `PORT` | Server | HTTP port (the host may set this automatically) |
| `NODE_ENV` | Both | Environment mode; production enables Secure cross-site cookies |
| `CLIENT_URL` | Server | Exact allowed storefront origin for CORS and state-changing requests |
| `VITE_API_URL` | Client | API base URL, including `/api` |
| `SESSION_TTL_DAYS` | Server | Session lifetime; defaults to 7 |
| `COOKIE_SECURE` | Server | Force Secure cookies in local HTTPS development |
| `SEED_ADMIN_EMAIL` | Seed | Admin email created by the seed command |
| `SEED_ADMIN_PASSWORD` | Seed | Admin password; minimum 12 characters, never commit a real value |

For database changes during local development, edit `server/prisma/schema.prisma`, then run `npm run db:migrate --workspace server -- --name describe-change`. Apply checked-in migrations in production with `npm run db:deploy --workspace server`.

## API overview

Catalog prices use integer minor units (100 paise per rupee). Catalog list parameters include `q`, `category`, `size`, `minPriceCents`, `maxPriceCents`, `inStock`, `featured`, `sort`, `page`, and `limit`. Price sorting and other sort modes are paginated by the API.

| Area | Routes | Notes |
| --- | --- | --- |
| Health | `GET /api/health` | Includes database readiness |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Passwords are never returned |
| Catalog | `GET /api/categories`, `GET /api/products`, `GET /api/products/:slug` | Public routes expose published products only |
| Cart | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `DELETE /api/cart` | Requires a signed-in user |
| Orders | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:orderNumber` | Checkout and order access are authenticated and owner-scoped |
| Admin catalog | `GET/POST /api/admin/products`, `PATCH /api/admin/products/:id`, `POST /api/admin/products/:id/variants`, `PATCH /api/admin/variants/:id` | Requires `ADMIN`; hide products or variants with their active/published flags |
| Admin orders | `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` | Enforces valid status transitions |

## Authentication and security

Passwords are hashed with bcryptjs at cost 12. Login and registration create a cryptographically random opaque session token; PostgreSQL stores only its SHA-256 hash and expiry. Session lookup and `requireRole('ADMIN')` run on the server. The login error is generic, and auth endpoints have a tighter rate limit.

In development, the session cookie is HttpOnly and SameSite=Lax. Production uses HttpOnly, Secure, SameSite=None cookies because the Vercel and Render origins are cross-site. Production mutations must carry the exact configured `Origin`; CORS also allows only that storefront origin. For better browser compatibility with third-party-cookie restrictions, use a same-site custom domain or a same-origin API proxy in production.

Other protections include Helmet, a JSON body-size limit, global request rate limiting, Zod validation, server-side role checks, no-store headers for private responses, stock checks inside serializable transactions, and restrictive foreign-key behavior for order history. Admin image URLs must use HTTPS.

## Checkout rules

FitCheck currently supports **cash on delivery only**. It does not claim a card payment was processed. The API calculates subtotal from the database, charges ₹300 delivery below ₹5,000, and offers complimentary delivery at or above ₹5,000. Listed prices include taxes. During checkout, the server rechecks every selected variant and performs stock decrement, order creation, and cart clearing in one serializable PostgreSQL transaction. If any check fails, the transaction rolls back.

Admin transitions follow `PENDING → PROCESSING → SHIPPED → DELIVERED`; pending and processing orders may also be cancelled. Cancelling restores the units to variant inventory transactionally. Product hiding is reversible and leaves historical order snapshots intact.

## Tests and checks

- `npm test` runs dependency-free currency-format tests and the API integration workflow.
- To run the API integration workflow, set `TEST_DATABASE_URL` to a dedicated disposable PostgreSQL database with the migration applied. The test covers registration, role denial, catalog, cart changes, out-of-stock rejection, checkout, inventory decrement/restock, and owner-scoped order access.
- `npm run lint` runs ESLint in both workspaces.
- `npm run build` builds the Vite storefront.

## Deployment

### Vercel client

Connect the repository to Vercel using the root workspace. `vercel.json` sets the client build command, output directory, and SPA route rewrite. Set `VITE_API_URL` to the deployed API base URL, including `/api`.

### Render API

`render.yaml` installs workspace dependencies, generates Prisma Client, runs checked-in migrations at service start, and uses `/api/health` as its health check. Set `DATABASE_URL` to the hosted PostgreSQL URL and `CLIENT_URL` to the exact HTTPS storefront origin. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, then run the seed command once against the deployed database.

Never place server secrets in Vite variables. Do not commit `.env` or production credentials.

## Interview walkthrough

- **What happens when a user adds an item?** The client sends the selected variant ID and quantity with the session cookie. Express authenticates the user, loads the published variant, checks stock, upserts their cart line, then returns a cart whose prices and subtotal came from PostgreSQL.
- **What happens during checkout?** The API loads the user’s cart in a serializable transaction, validates stock again, conditionally decrements each variant, creates the order and immutable line snapshots, clears the cart, and commits all changes together.
- **How is the user authenticated?** bcrypt verifies the password. A random session token is placed in an HttpOnly cookie; only its hash and expiry are stored in the `Session` table.
- **How is admin access enforced?** `authenticate` resolves the session, then `requireRole('ADMIN')` rejects non-admin requests before admin handlers run. Hiding controls in React is only a presentation choice.
- **Why PostgreSQL and Prisma?** PostgreSQL provides relational constraints and transactions for cart/order/inventory consistency. Prisma makes relations, validations, and transaction boundaries explicit in application code.
- **How do admin changes reach the storefront?** The workroom updates product, variant, or order records via the same API/database that customer catalog and account requests read.

## Scope and known limitations

- There is no external card processor; checkout is cash on delivery.
- Product images are supplied as HTTPS URLs; image upload/CDN management is not included.
- Wishlist, newsletter subscriptions, saved-address management, and carrier tracking are not implemented.
- Vercel/Render configuration is provided, but no live deployment is included in this repository.
- `package-lock.json` is checked in; use `npm ci` for repeatable installs.
- The local dependency install, Vite production build, ESLint run, and Prisma schema validation pass. Applying the migration and running the PostgreSQL integration workflow still require a reachable database; Prisma Client generation also requires its platform engine download.

## Development phases

The application was built incrementally in the 18 requested phases, with a meaningful Git commit at each phase boundary. Review the commit history with `git log --oneline` to follow the architecture, schema, API, customer flows, security, testing, deployment, and documentation changes.
