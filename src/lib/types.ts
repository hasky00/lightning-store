export interface Product {
  id: string;
  name: string;
  description: string;
  priceSats: number;
  image: string;
  createdAt: number;
  /** Units in stock, or null for an unlimited/made-to-order item. */
  stock: number | null;
}

/** A product plus how many can actually be bought right now. */
export interface ProductListing extends Product {
  /** null when stock is unlimited. */
  available: number | null;
  soldOut: boolean;
}

export interface StoreSettings {
  storeName: string;
}

/**
 * Where an order stands, as reported by the merchant wallet. Note there is no
 * client-settable variant of this: the browser reads these values, it never
 * produces them.
 */
export type PaymentState = "pending" | "paid" | "expired" | "failed";

export type OrderState = PaymentState;

/** What the buyer optionally tells the shop so it can deliver. */
export interface OrderContact {
  email: string;
  note: string;
}

export interface Order {
  /** Opaque internal id. */
  id: string;
  /** Short code a human can quote, e.g. "LS-7F3K2M". */
  reference: string;
  paymentHash: string;
  productId: string;
  /**
   * Snapshotted at purchase. A product can later be renamed, repriced or
   * deleted; what was actually sold must not change with it.
   */
  productName: string;
  priceSats: number;
  state: OrderState;
  contact: OrderContact | null;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  fulfilledAt: number | null;
}

/** An order as its buyer may see it — no internal ids. */
export type OrderReceipt = Omit<Order, "id" | "paymentHash">;

export interface CheckoutResponse {
  /** Signed, opaque token used to poll this order's status. */
  orderId: string;
  invoice: string;
  /** Unix seconds. */
  expiresAt: number;
  product: Pick<Product, "id" | "name" | "priceSats">;
  order: OrderReceipt;
}

export interface OrderStatusResponse {
  orderId: string;
  state: OrderState;
  settledAt: number | null;
  amountSats: number;
  productId: string;
  priceSats: number;
  expiresAt: number;
  order: OrderReceipt;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "SOLD_OUT"
  | "MERCHANT_NOT_CONFIGURED"
  | "WALLET_ERROR"
  | "INTERNAL";

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
}
