export interface Product {
  id: string;
  name: string;
  description: string;
  priceSats: number;
  image: string;
  createdAt: number;
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

export interface CheckoutResponse {
  /** Signed, opaque token used to poll this order's status. */
  orderId: string;
  invoice: string;
  /** Unix seconds. */
  expiresAt: number;
  product: Pick<Product, "id" | "name" | "priceSats">;
}

export interface OrderStatusResponse {
  orderId: string;
  state: PaymentState;
  settledAt: number | null;
  amountSats: number;
  productId: string;
  priceSats: number;
  expiresAt: number;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "MERCHANT_NOT_CONFIGURED"
  | "WALLET_ERROR"
  | "INTERNAL";

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
}
