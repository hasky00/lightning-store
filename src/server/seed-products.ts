import "server-only";

import type { Product } from "@/lib/types";

/**
 * What a brand-new shop starts with, so a fresh clone has something to show.
 *
 * These live in code rather than in `data/`, which is gitignored runtime
 * state: the catalogue a shop actually sells is its own, not something that
 * should arrive in a pull request. The first admin edit writes a real file and
 * these stop being used.
 */
export const SEED_PRODUCTS: Product[] = [
  {
    id: "seed-lightning-mug",
    name: "Lightning Mug",
    description: "Ceramic mug with a bold ⚡ bolt design.",
    priceSats: 2100,
    image: "",
    createdAt: 1758326400000,
  },
  {
    id: "seed-sticker-pack",
    name: "Sat Sticker Pack",
    description: "12 weatherproof stickers for your laptop.",
    priceSats: 500,
    image: "",
    createdAt: 1758326400001,
  },
  {
    id: "seed-nostr-tee",
    name: "Nostr Tee",
    description: "Soft cotton tee — purple relay vibes.",
    priceSats: 15000,
    image: "",
    createdAt: 1758326400002,
  },
  {
    id: "seed-pizza-pin",
    name: "Bitcoin Pizza Slice",
    description: "Commemorative enamel pin. May 22 approved.",
    priceSats: 10000,
    image: "",
    createdAt: 1758326400003,
  },
  {
    id: "seed-hub-keychain",
    name: "Alby Hub Keychain",
    description: "Mini hub charm for your keys or bag.",
    priceSats: 3000,
    image: "",
    createdAt: 1758326400004,
  },
  {
    id: "seed-sats-calculator",
    name: "Sats Calculator",
    description: "Solar-powered — never run out of sats math.",
    priceSats: 8000,
    image: "",
    createdAt: 1758326400005,
  },
];
