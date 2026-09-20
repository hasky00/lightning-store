"use client";

import { create } from "zustand";
import { clearNwcUrl, connectViaAlby, loadNwcUrl, saveNwcUrl } from "@/lib/nwc";

/**
 * The buyer's own wallet connection.
 *
 * There is deliberately no merchant half any more: the shop's wallet moved to
 * the server, where its secret cannot be read by anyone visiting the page.
 */
interface WalletState {
  connected: boolean;
  url: string | null;
  connecting: boolean;
  hydrated: boolean;
  hydrate: () => void;
  connect: (hubUrl?: string) => Promise<void>;
  disconnect: () => void;
  setUrl: (url: string) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  url: null,
  connecting: false,
  hydrated: false,

  hydrate: () => {
    const url = loadNwcUrl();
    set({ url, connected: !!url, hydrated: true });
  },

  connect: async (hubUrl) => {
    set({ connecting: true });
    try {
      const url = await connectViaAlby(hubUrl);
      set({ url, connected: true, connecting: false });
    } catch (error) {
      set({ connecting: false });
      throw error;
    }
  },

  disconnect: () => {
    clearNwcUrl();
    set({ url: null, connected: false });
  },

  setUrl: (url: string) => {
    saveNwcUrl(url);
    set({ url, connected: !!url });
  },
}));
