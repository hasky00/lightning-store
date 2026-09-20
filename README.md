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

## Merchant wallet setup (required for checkout)

Invoices are created and verified **on the server**, so the store needs its own
wallet connection. It is never sent to the browser.

1. Copy the template: `cp .env.example .env.local`
2. At [Alby Hub](https://my.albyhub.com) go to **Connections -> Add Connection**
   and enable the `make_invoice` and `lookup_invoice` permissions. Leave
   `pay_invoice` **off** — the store only receives.
3. Paste the connection string into `MERCHANT_NWC_URL`.
4. Generate a signing key: `openssl rand -hex 32`, and put it in
   `ORDER_SIGNING_SECRET`.

`.env.local` is gitignored. Never commit a filled-in copy.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/products` | The catalogue, read from `data/products.json`. |
| `POST /api/checkout` | Takes `{ productId }`, returns `{ orderId, invoice, expiresAt, product }`. |
| `GET /api/orders/{orderId}` | Returns `{ state, settledAt, amountSats, ... }` where `state` is `pending`, `paid`, `expired` or `failed`. |

Two rules make this safe to take money with:

- **The browser never states a price.** Checkout sends only a product id; the
  server looks the price up in the catalogue before minting an invoice.
- **The browser never states that it paid.** `state` comes from asking the
  merchant wallet via `lookup_invoice`. A client cannot assert `paid`.

The `orderId` is a signed token rather than a database row: it carries the
payment hash and is HMAC-signed, so it cannot be forged or altered, and it
cannot be used to look up anyone else's payments. The wallet is the ledger.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
