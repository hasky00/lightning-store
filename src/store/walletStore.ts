"use client";

import { create } from "zustand";
import {
  clearNwcUrl,
  connectViaAlby,
  loadNwcUrl,
  saveNwcUrl,
} from "@/lib/nwc";
import { useProductStore } from "@/store/productStore";

interface WalletState {
  buyerConnected: boolean;
  merchantConnected: boolean;
  buyerUrl: string | null;
  merchantUrl: string | null;
  connecting: "buyer" | "merchant" | null;
  hydrated: boolean;
  hydrate: () => void;
  connectBuyer: (hubUrl?: string) => Promise<void>;
  connectMerchant: (hubUrl?: string) => Promise<string>;
  disconnectBuyer: () => void;
  disconnectMerchant: () => void;
  setMerchantUrl: (url: string) => void;
  setBuyerUrl: (url: string) => void;
  getEffectiveMerchantUrl: () => string;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  buyerConnected: false,
  merchantConnected: false,
  buyerUrl: null,
  merchantUrl: null,
  connecting: null,
  hydrated: false,

  hydrate: () => {
    const buyerUrl = loadNwcUrl("buyer");
    let merchantUrl = loadNwcUrl("merchant");

    const settingsUrl =
      useProductStore.getState().settings.merchantNwcUrl?.trim() || "";

    if (!merchantUrl && settingsUrl) {
      merchantUrl = settingsUrl;
      saveNwcUrl("merchant", settingsUrl);
    }

    set({
      buyerUrl,
      merchantUrl,
      buyerConnected: !!buyerUrl,
      merchantConnected: !!merchantUrl,
      hydrated: true,
    });
  },

  getEffectiveMerchantUrl: () => {
    const { merchantUrl } = get();
    const settingsUrl =
      useProductStore.getState().settings.merchantNwcUrl?.trim() || "";
    return merchantUrl || settingsUrl || "";
  },

  connectBuyer: async (hubUrl) => {
    set({ connecting: "buyer" });
    try {
      const url = await connectViaAlby("buyer", hubUrl);
      set({ buyerUrl: url, buyerConnected: true, connecting: null });
    } catch {
      set({ connecting: null });
      throw new Error("Failed to connect buyer wallet");
    }
  },

  connectMerchant: async (hubUrl) => {
    set({ connecting: "merchant" });
    try {
      const url = await connectViaAlby("merchant", hubUrl);
      saveNwcUrl("merchant", url);
      useProductStore.getState().updateSettings({ merchantNwcUrl: url });
      set({ merchantUrl: url, merchantConnected: true, connecting: null });
      return url;
    } catch {
      set({ connecting: null });
      throw new Error("Failed to connect merchant wallet");
    }
  },

  disconnectBuyer: () => {
    clearNwcUrl("buyer");
    set({ buyerUrl: null, buyerConnected: false });
  },

  disconnectMerchant: () => {
    clearNwcUrl("merchant");
    useProductStore.getState().updateSettings({ merchantNwcUrl: "" });
    set({ merchantUrl: null, merchantConnected: false });
  },

  setMerchantUrl: (url: string) => {
    saveNwcUrl("merchant", url);
    useProductStore.getState().updateSettings({ merchantNwcUrl: url });
    set({ merchantUrl: url, merchantConnected: !!url });
  },

  setBuyerUrl: (url: string) => {
    saveNwcUrl("buyer", url);
    set({ buyerUrl: url, buyerConnected: !!url });
  },
}));