"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, StoreSettings } from "@/lib/types";
import { generateId } from "@/lib/utils";

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "sample-1",
    name: "Lightning Mug",
    description: "Ceramic mug with a bold ⚡ bolt design.",
    priceSats: 2100,
    image: "",
    createdAt: Date.now(),
  },
  {
    id: "sample-2",
    name: "Sat Sticker Pack",
    description: "12 weatherproof stickers for your laptop.",
    priceSats: 500,
    image: "",
    createdAt: Date.now(),
  },
  {
    id: "sample-3",
    name: "Nostr Tee",
    description: "Soft cotton tee — purple relay vibes.",
    priceSats: 15000,
    image: "",
    createdAt: Date.now(),
  },
  {
    id: "sample-4",
    name: "Bitcoin Pizza Slice",
    description: "Commemorative enamel pin. May 22 approved.",
    priceSats: 10000,
    image: "",
    createdAt: Date.now(),
  },
  {
    id: "sample-5",
    name: "Alby Hub Keychain",
    description: "Mini hub charm for your keys or bag.",
    priceSats: 3000,
    image: "",
    createdAt: Date.now(),
  },
  {
    id: "sample-6",
    name: "Sats Calculator",
    description: "Solar-powered — never run out of sats math.",
    priceSats: 8000,
    image: "",
    createdAt: Date.now(),
  },
];

interface ProductState {
  products: Product[];
  settings: StoreSettings;
  addProduct: (data: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => void;
  deleteProduct: (id: string) => void;
  updateSettings: (settings: Partial<StoreSettings>) => void;
  seedSamples: () => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      settings: {
        storeName: "⚡ Sats Market",
        merchantNwcUrl: "",
      },
      addProduct: (data) =>
        set((state) => ({
          products: [
            { ...data, id: generateId(), createdAt: Date.now() },
            ...state.products,
          ],
        })),
      updateProduct: (id, data) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),
      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
      seedSamples: () => {
        if (get().products.length === 0) {
          set({ products: SAMPLE_PRODUCTS });
        }
      },
    }),
    {
      name: "lightning-store-products",
      onRehydrateStorage: () => (state) => {
        state?.seedSamples();
      },
    }
  )
);