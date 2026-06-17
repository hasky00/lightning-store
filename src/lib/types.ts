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
  merchantNwcUrl: string;
}

export type WalletRole = "buyer" | "merchant";

export interface CheckoutState {
  product: Product;
  invoice: string;
  status: "creating" | "ready" | "paying" | "paid" | "error";
  error?: string;
}