"use client";

import { NostrWebLNProvider, type Nip47Method } from "@getalby/sdk";

/**
 * Buyer-side wallet access.
 *
 * Only the *buyer's* wallet is handled in the browser, which is correct: it is
 * their key and their choice to spend. The shop's own wallet lives on the
 * server and is never loaded here.
 */

export const DEFAULT_HUB_URL = "https://my.albyhub.com";
export const HUB_CONNECTIONS_URL = `${DEFAULT_HUB_URL}/connections`;

const STORAGE_BUYER_KEY = "lightning-store-buyer-nwc";
const STORAGE_HUB_KEY = "lightning-store-hub-url";

/** A buyer wallet only ever needs to spend; it never issues invoices. */
const BUYER_METHODS: Nip47Method[] = ["get_info", "get_balance", "pay_invoice"];

export function saveNwcUrl(url: string) {
  localStorage.setItem(STORAGE_BUYER_KEY, url);
}

export function loadNwcUrl(): string | null {
  return localStorage.getItem(STORAGE_BUYER_KEY);
}

export function clearNwcUrl() {
  localStorage.removeItem(STORAGE_BUYER_KEY);
}

export function saveHubUrl(url: string) {
  localStorage.setItem(STORAGE_HUB_KEY, url);
}

export function loadHubUrl(): string {
  return localStorage.getItem(STORAGE_HUB_KEY) || DEFAULT_HUB_URL;
}

export function buildHubAuthUrl(hubUrl: string): string {
  return `${hubUrl.trim().replace(/\/$/, "")}/apps/new`;
}

export async function connectViaAlby(
  hubUrl = loadHubUrl(),
  appName = "Lightning Store"
): Promise<string> {
  const provider = await NostrWebLNProvider.fromAuthorizationUrl(
    buildHubAuthUrl(hubUrl),
    { name: appName, requestMethods: BUYER_METHODS }
  );
  await provider.enable();
  const url = provider.client.getNostrWalletConnectUrl(true);
  saveNwcUrl(url);
  saveHubUrl(hubUrl);
  provider.close();
  return url;
}

export async function payInvoice(buyerUrl: string, invoice: string) {
  const provider = new NostrWebLNProvider({ nostrWalletConnectUrl: buyerUrl });
  await provider.enable();
  try {
    return await provider.sendPayment(invoice);
  } finally {
    provider.close();
  }
}
