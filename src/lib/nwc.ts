"use client";

import {
  NWCClient,
  NostrWebLNProvider,
  type Nip47Method,
} from "@getalby/sdk";
import { satsToMsats } from "./utils";

export const DEFAULT_HUB_URL = "https://my.albyhub.com";
export const HUB_CONNECTIONS_URL = `${DEFAULT_HUB_URL}/connections`;

const STORAGE_BUYER_KEY = "lightning-store-buyer-nwc";
const STORAGE_MERCHANT_KEY = "lightning-store-merchant-nwc";
const STORAGE_HUB_KEY = "lightning-store-hub-url";

const MERCHANT_METHODS: Nip47Method[] = [
  "get_info",
  "get_balance",
  "make_invoice",
  "lookup_invoice",
];

const BUYER_METHODS: Nip47Method[] = [
  "get_info",
  "get_balance",
  "pay_invoice",
];

export function saveNwcUrl(role: "buyer" | "merchant", url: string) {
  const key = role === "buyer" ? STORAGE_BUYER_KEY : STORAGE_MERCHANT_KEY;
  localStorage.setItem(key, url);
}

export function loadNwcUrl(role: "buyer" | "merchant"): string | null {
  const key = role === "buyer" ? STORAGE_BUYER_KEY : STORAGE_MERCHANT_KEY;
  return localStorage.getItem(key);
}

export function clearNwcUrl(role: "buyer" | "merchant") {
  const key = role === "buyer" ? STORAGE_BUYER_KEY : STORAGE_MERCHANT_KEY;
  localStorage.removeItem(key);
}

export function saveHubUrl(url: string) {
  localStorage.setItem(STORAGE_HUB_KEY, url);
}

export function loadHubUrl(): string {
  return localStorage.getItem(STORAGE_HUB_KEY) || DEFAULT_HUB_URL;
}

export function buildHubAuthUrl(hubUrl: string): string {
  const base = hubUrl.trim().replace(/\/$/, "");
  return `${base}/apps/new`;
}

export async function connectViaAlby(
  role: "buyer" | "merchant",
  hubUrl = loadHubUrl(),
  appName = "Lightning Store"
): Promise<string> {
  const authUrl = buildHubAuthUrl(hubUrl);
  const requestMethods = role === "merchant" ? MERCHANT_METHODS : BUYER_METHODS;

  const provider = await NostrWebLNProvider.fromAuthorizationUrl(authUrl, {
    name: `${appName} (${role})`,
    requestMethods,
  });
  await provider.enable();
  const url = provider.client.getNostrWalletConnectUrl(true);
  saveNwcUrl(role, url);
  saveHubUrl(hubUrl);
  provider.close();
  return url;
}

export function createMerchantClient(url: string): NWCClient {
  return new NWCClient({ nostrWalletConnectUrl: url });
}

export function createBuyerProvider(url: string): NostrWebLNProvider {
  return new NostrWebLNProvider({ nostrWalletConnectUrl: url });
}

export async function createProductInvoice(
  merchantUrl: string,
  priceSats: number,
  description: string
): Promise<string> {
  const client = createMerchantClient(merchantUrl);
  const tx = await client.makeInvoice({
    amount: satsToMsats(priceSats),
    description,
    expiry: 600,
  });
  return tx.invoice;
}

export async function payInvoice(buyerUrl: string, invoice: string) {
  const provider = createBuyerProvider(buyerUrl);
  await provider.enable();
  try {
    const result = await provider.sendPayment(invoice);
    return result;
  } finally {
    provider.close();
  }
}