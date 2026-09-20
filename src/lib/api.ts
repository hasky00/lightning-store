"use client";

import type {
  ApiErrorCode,
  CheckoutResponse,
  OrderStatusResponse,
  Product,
  StoreSettings,
} from "./types";

/**
 * Typed wrappers around the store's own API.
 *
 * Every failure arrives as an ApiRequestError carrying the server's `code`,
 * so callers can react to *why* something failed (needs configuring, signed
 * out, rejected input) instead of matching on message text.
 */

export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(message: string, code: ApiErrorCode, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: init?.body
        ? { "Content-Type": "application/json", ...init?.headers }
        : init?.headers,
    });
  } catch {
    throw new ApiRequestError(
      "Could not reach the store. Check your connection.",
      "INTERNAL",
      0
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON body is only a problem if we also needed it to explain a
    // failure; a successful response with an empty body is fine.
  }

  if (!response.ok) {
    const body = (payload ?? {}) as { error?: unknown; code?: unknown };
    throw new ApiRequestError(
      typeof body.error === "string" ? body.error : "Request failed.",
      typeof body.code === "string" ? (body.code as ApiErrorCode) : "INTERNAL",
      response.status
    );
  }

  return payload as T;
}

export async function fetchProducts(): Promise<Product[]> {
  const { products } = await request<{ products: Product[] }>("/api/products");
  return products;
}

export async function fetchSettings(): Promise<StoreSettings> {
  const { settings } = await request<{ settings: StoreSettings }>(
    "/api/settings"
  );
  return settings;
}

export function startCheckout(productId: string): Promise<CheckoutResponse> {
  return request<CheckoutResponse>("/api/checkout", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export function fetchOrderStatus(
  orderId: string,
  signal?: AbortSignal
): Promise<OrderStatusResponse> {
  return request<OrderStatusResponse>(
    `/api/orders/${encodeURIComponent(orderId)}`,
    { signal }
  );
}

export async function signIn(password: string): Promise<void> {
  await request("/api/admin/session", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function signOut(): Promise<void> {
  await request("/api/admin/session", { method: "DELETE" });
}

export async function fetchSignedIn(): Promise<boolean> {
  const { signedIn } = await request<{ signedIn: boolean }>(
    "/api/admin/session"
  );
  return signedIn;
}

export interface NewProduct {
  name: string;
  description: string;
  priceSats: number;
  image: string;
}

export async function createProduct(draft: NewProduct): Promise<Product> {
  const { product } = await request<{ product: Product }>("/api/products", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  await request(`/api/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function updateStoreName(
  storeName: string
): Promise<StoreSettings> {
  const { settings } = await request<{ settings: StoreSettings }>(
    "/api/settings",
    { method: "PATCH", body: JSON.stringify({ storeName }) }
  );
  return settings;
}
