import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_PASSWORD, createClient, startServer } from "./helpers.mjs";

/**
 * These run against a real server with a mock wallet, so they cover the
 * actual HTTP surface: routing, auth, validation, signing and the full
 * pay-to-fulfilled flow. The point is that this code moves money — the parts
 * that decide who may do what, and what something costs, should not be able
 * to regress quietly.
 */

let server;
let shop;
let admin;

before(async () => {
  server = await startServer();
  shop = createClient(server.base);
  admin = createClient(server.base);
}, { timeout: 120_000 });

after(async () => {
  await server?.stop();
});

async function signIn() {
  const res = await admin.request("/api/admin/session", {
    method: "POST",
    body: { password: ADMIN_PASSWORD },
  });
  assert.equal(res.status, 200);
}

async function addProduct(overrides = {}) {
  const res = await admin.request("/api/products", {
    method: "POST",
    body: {
      name: "Test Item",
      description: "",
      priceSats: 1000,
      image: "",
      stock: null,
      ...overrides,
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.product;
}

describe("public catalogue", () => {
  it("serves the seed catalogue", async () => {
    const res = await shop.request("/api/products");
    assert.equal(res.status, 200);
    assert.ok(res.body.products.length > 0);
  });

  it("serves the shop name", async () => {
    const res = await shop.request("/api/settings");
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.settings.storeName, "string");
  });

  it("returns 404 for an unknown product", async () => {
    const res = await shop.request("/api/products/nope");
    assert.equal(res.status, 404);
  });
});

describe("admin authorisation", () => {
  it("refuses writes when signed out", async () => {
    const anon = createClient(server.base);
    for (const [path, options] of [
      ["/api/products", { method: "POST", body: { name: "x", priceSats: 1 } }],
      ["/api/settings", { method: "PATCH", body: { storeName: "x" } }],
      ["/api/products/anything", { method: "DELETE" }],
      ["/api/products/anything", { method: "PATCH", body: { name: "x" } }],
      ["/api/admin/orders", { method: "GET" }],
      ["/api/admin/orders/x", { method: "PATCH", body: { fulfilled: true } }],
    ]) {
      const res = await anon.request(path, options);
      assert.equal(res.status, 401, `${options.method} ${path}`);
      assert.equal(res.body.code, "UNAUTHORIZED");
    }
  });

  it("refuses a wrong password", async () => {
    const res = await admin.request("/api/admin/session", {
      method: "POST",
      body: { password: "wrong" },
    });
    assert.equal(res.status, 401);
  });

  it("accepts the right password and sets an httpOnly cookie", async () => {
    const res = await admin.request("/api/admin/session", {
      method: "POST",
      body: { password: ADMIN_PASSWORD },
    });
    assert.equal(res.status, 200);
    const setCookie = res.headers.getSetCookie().join(";");
    assert.match(setCookie, /HttpOnly/i);
  });

  it("revokes access on sign out", async () => {
    const session = createClient(server.base);
    await session.request("/api/admin/session", {
      method: "POST",
      body: { password: ADMIN_PASSWORD },
    });
    await session.request("/api/admin/session", { method: "DELETE" });

    const res = await session.request("/api/settings", {
      method: "PATCH",
      body: { storeName: "Nope" },
    });
    assert.equal(res.status, 401);
  });
});

describe("product validation", () => {
  before(signIn);

  it("rejects bad prices", async () => {
    for (const priceSats of [0, -5, 1.5, "1000", null]) {
      const res = await admin.request("/api/products", {
        method: "POST",
        body: { name: "X", description: "", priceSats, image: "", stock: null },
      });
      assert.equal(res.status, 400, `price ${priceSats}`);
    }
  });

  it("rejects an empty name", async () => {
    const res = await admin.request("/api/products", {
      method: "POST",
      body: { name: "  ", description: "", priceSats: 10, image: "", stock: null },
    });
    assert.equal(res.status, 400);
  });

  it("rejects images it did not store itself", async () => {
    for (const image of [
      "https://evil.example/x.jpg",
      "/uploads/../../../.env",
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:text/html;base64,PHNjcmlwdD4=",
    ]) {
      const res = await admin.request("/api/products", {
        method: "POST",
        body: { name: "X", description: "", priceSats: 10, image, stock: null },
      });
      assert.equal(res.status, 400, image);
    }
  });

  it("stores a real image as a file and serves it", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const product = await addProduct({ name: "With Image", image: png });

    assert.match(product.image, /^\/uploads\/[0-9a-f-]+\.png$/);
    const res = await fetch(`${server.base}${product.image}`);
    assert.equal(res.status, 200);
  });

  it("edits a product without changing its id", async () => {
    const product = await addProduct({ name: "Before", priceSats: 100 });
    const res = await admin.request(`/api/products/${product.id}`, {
      method: "PATCH",
      body: {
        name: "After",
        description: "edited",
        priceSats: 250,
        image: "",
        stock: 7,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.product.id, product.id);
    assert.equal(res.body.product.name, "After");
    assert.equal(res.body.product.priceSats, 250);
    assert.equal(res.body.product.stock, 7);
    assert.equal(res.body.product.createdAt, product.createdAt);
  });
});

describe("order tokens", () => {
  before(signIn);

  it("rejects an unknown order id", async () => {
    const res = await shop.request("/api/orders/garbage");
    assert.equal(res.status, 404);
  });

  it("rejects a tampered token", async () => {
    const product = await addProduct({ name: "Token Test", priceSats: 2100 });
    const checkout = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id },
    });
    assert.equal(checkout.status, 200);

    const [payload, signature] = checkout.body.orderId.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    claims.sats = 1;
    const forged = `${Buffer.from(JSON.stringify(claims)).toString(
      "base64url"
    )}.${signature}`;

    const res = await shop.request(`/api/orders/${forged}`);
    assert.equal(res.status, 404, "a re-priced token must not be honoured");

    const flipped = `${checkout.body.orderId.slice(0, -1)}X`;
    const res2 = await shop.request(`/api/orders/${flipped}`);
    assert.equal(res2.status, 404, "a broken signature must not be honoured");
  });
});

describe("checkout and payment", () => {
  before(signIn);

  it("prices from the catalogue, not the request", async () => {
    const product = await addProduct({ name: "Priced", priceSats: 4242 });
    const res = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id, priceSats: 1 },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.product.priceSats, 4242);
    assert.equal(res.body.order.priceSats, 4242);
  });

  it("runs the full flow: pending -> paid -> fulfilled", async () => {
    const product = await addProduct({ name: "Full Flow", priceSats: 777 });

    const checkout = await shop.request("/api/checkout", {
      method: "POST",
      body: {
        productId: product.id,
        contact: { email: "buyer@example.com", note: "Leave at the door" },
      },
    });
    assert.equal(checkout.status, 200);
    assert.match(checkout.body.order.reference, /^LS-[A-Z0-9]{6}$/);

    const orderId = checkout.body.orderId;

    const pending = await shop.request(`/api/orders/${orderId}`);
    assert.equal(pending.body.state, "pending");

    // Settle through the wallet, exactly as a real payment would.
    const paymentHash = checkout.body.invoice.replace("lnbcmock1", "");
    const settled = await shop.request("/api/dev/settle", {
      method: "POST",
      body: { paymentHash },
    });
    assert.equal(settled.body.changed, true);

    const paid = await shop.request(`/api/orders/${orderId}`);
    assert.equal(paid.body.state, "paid");
    assert.equal(paid.body.order.state, "paid");
    assert.ok(paid.body.order.paidAt);

    // The buyer's receipt must not leak internal identifiers.
    assert.equal(paid.body.order.paymentHash, undefined);
    assert.equal(paid.body.order.id, undefined);

    const orders = await admin.request("/api/admin/orders");
    const stored = orders.body.orders.find(
      (o) => o.reference === checkout.body.order.reference
    );
    assert.ok(stored, "the order should appear in the admin list");
    assert.equal(stored.contact.email, "buyer@example.com");
    assert.equal(stored.fulfilledAt, null);

    const fulfilled = await admin.request(`/api/admin/orders/${stored.id}`, {
      method: "PATCH",
      body: { fulfilled: true },
    });
    assert.equal(fulfilled.status, 200);
    assert.ok(fulfilled.body.order.fulfilledAt);
  });

  it("reports an expired invoice without charging", async () => {
    const product = await addProduct({ name: "Expiry", priceSats: 50 });
    const checkout = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id },
    });

    const paymentHash = checkout.body.invoice.replace("lnbcmock1", "");
    await shop.request("/api/dev/settle", {
      method: "POST",
      body: { paymentHash, action: "expire" },
    });

    const res = await shop.request(`/api/orders/${checkout.body.orderId}`);
    assert.equal(res.body.state, "expired");
  });

  it("validates contact details", async () => {
    const product = await addProduct({ name: "Contact", priceSats: 10 });
    const res = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id, contact: { email: "not-an-email" } },
    });
    assert.equal(res.status, 400);
  });
});

describe("stock", () => {
  before(signIn);

  it("holds the last unit while an invoice is live, then sells out", async () => {
    const product = await addProduct({ name: "Only One", priceSats: 100, stock: 1 });

    const first = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id },
    });
    assert.equal(first.status, 200);

    // A second buyer must be refused while the first invoice is outstanding.
    const second = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id },
    });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, "SOLD_OUT");

    const listing = await shop.request(`/api/products/${product.id}`);
    assert.equal(listing.body.product.soldOut, true);
    assert.equal(listing.body.product.available, 0);
  });

  it("releases the hold when the invoice expires", async () => {
    const product = await addProduct({ name: "Released", priceSats: 100, stock: 1 });

    const first = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id },
    });
    const paymentHash = first.body.invoice.replace("lnbcmock1", "");

    // Expiring the invoice is not enough on its own: the order record only
    // learns about it when someone asks, which is what the buyer's poll does.
    await shop.request("/api/dev/settle", {
      method: "POST",
      body: { paymentHash, action: "expire" },
    });
    await shop.request(`/api/orders/${first.body.orderId}`);

    const second = await shop.request("/api/checkout", {
      method: "POST",
      body: { productId: product.id },
    });
    assert.equal(second.status, 200, "the abandoned hold should have lapsed");
  });

  it("keeps unlimited products always available", async () => {
    const product = await addProduct({ name: "Unlimited", stock: null });
    for (let i = 0; i < 3; i += 1) {
      const res = await shop.request("/api/checkout", {
        method: "POST",
        body: { productId: product.id },
      });
      assert.equal(res.status, 200);
    }
  });
});
