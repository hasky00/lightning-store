This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Try it without a wallet

You can walk the entire purchase flow before touching real credentials:

```bash
cp .env.example .env.local        # set ORDER_SIGNING_SECRET and ADMIN_PASSWORD
MOCK_WALLET=1 npm run dev
```

Buy something. A mock invoice appears and settles itself after a few seconds,
the order lands in the admin Orders tab, and you can mark it sent.

The mock wallet **refuses to start under `NODE_ENV=production`**. A shop that
marks orders paid without being paid is worse than a shop that is down, so
this is not something an operator can turn on by accident.

## Setup

Copy the template and fill it in:

```bash
cp .env.example .env.local
```

**`MERCHANT_NWC_URL`** — the shop's own wallet. At [Alby Hub](https://my.albyhub.com)
go to **Connections -> Add Connection** and enable `make_invoice` and
`lookup_invoice`. Leave `pay_invoice` **off**: the shop only ever receives, so
even a stolen key cannot spend.

**`ORDER_SIGNING_SECRET`** — signs order ids and admin sessions. Generate with
`openssl rand -hex 32`.

**`ADMIN_PASSWORD`** — guards `/admin` and every catalogue write. At least 12
characters. Until it is set, the admin area is locked rather than open.

`.env.local` is gitignored. Never commit a filled-in copy.

## How a payment works

```
Buyer clicks Buy
  -> POST /api/checkout { productId }      a product id, never a price
  -> server reads the price from its catalogue
  -> merchant wallet mints the invoice
  -> browser gets { orderId, invoice }     never the wallet secret

Browser shows the QR and polls GET /api/orders/{orderId}
  -> server asks the wallet: lookup_invoice
  -> settled? the order is paid
```

Two rules make this safe to take money with:

- **The browser never states a price.** Checkout sends only a product id.
- **The browser never states that it paid.** Settlement comes from the wallet.

Because confirmation is server-side, scanning the QR with *any* Lightning
wallet works exactly as well as paying with a connected one — the shop finds
out the same way either way.

The `orderId` is an HMAC-signed token carrying the payment hash. Order
*records* exist too, but only for fulfilment: what was bought, by whom, and
has it shipped. A record can never make something paid — the wallet decides
that, and the record follows it.

## Stock

Stock is optional per product; leave it blank for made-to-order.

Availability subtracts orders that are paid **or** still hold an unexpired
invoice. That in-flight invoice is what stops two buyers paying for the same
last item, and an abandoned checkout releases its hold when the invoice lapses
— there is nothing to clean up.

## API

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/products` | public | Catalogue with live availability |
| `GET /api/products/{id}` | public | One product |
| `GET /api/settings` | public | Shop name |
| `POST /api/checkout` | public | Mint an invoice; optional buyer contact |
| `GET /api/orders/{orderId}` | signed token | `pending` / `paid` / `expired` / `failed` |
| `POST`/`GET`/`DELETE /api/admin/session` | password / cookie | Sign in, check, sign out |
| `POST /api/products` | admin | Add a product |
| `PATCH`/`DELETE /api/products/{id}` | admin | Edit or remove |
| `PATCH /api/settings` | admin | Rename the shop |
| `GET /api/admin/orders` | admin | All orders with buyer details |
| `PATCH /api/admin/orders/{id}` | admin | Mark sent / unsent |

## Tests

```bash
npm test
```

Runs a real server with the mock wallet and exercises the money paths over
HTTP: pricing, authorisation, order-token forgery, stock holds, settlement and
fulfilment. CI runs typecheck, lint, build and these tests on every push —
with no secrets configured, so the build can never come to depend on one.

The suite starts its own server on a free port and in its own build
directory, so it runs fine alongside `npm run dev`.

## Where data lives

| Thing | Where | Why |
| --- | --- | --- |
| Merchant wallet key | server env | Secret; must never reach a browser |
| Products, shop name, orders | `data/*.json` | Server-owned; prices must be trustworthy |
| Product images | `public/uploads/` | Files, so the catalogue stays small |
| Buyer's wallet | their browser | Their key, their choice to spend |

`data/` and `public/uploads/` are gitignored runtime state — that is the shop's
own content, not source. **Back them up**: they hold your catalogue and your
order history. Set `STORE_DATA_DIR` to point at a mounted volume when
deploying. A fresh clone starts from the seed catalogue in
`src/server/seed-products.ts`.

Both are on local disk, so the store as written wants a normal server or
container with a persistent volume. On a read-only or per-request filesystem
(typical serverless hosting) reads work but writes will not — swap
`src/server/json-store.ts` for a database and everything above it stays as is.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
