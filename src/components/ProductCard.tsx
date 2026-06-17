"use client";

import { Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatSats, cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onBuy: (product: Product) => void;
}

const PLACEHOLDER_GRADIENTS = [
  "from-amber-400/30 to-orange-600/20",
  "from-violet-400/30 to-purple-600/20",
  "from-sky-400/30 to-blue-600/20",
  "from-emerald-400/30 to-teal-600/20",
  "from-rose-400/30 to-pink-600/20",
  "from-yellow-400/30 to-amber-600/20",
];

function getGradient(id: string) {
  const index = id.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length;
  return PLACEHOLDER_GRADIENTS[index];
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  return (
    <article className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-[var(--surface-2)]">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              getGradient(product.id)
            )}
          >
            <Zap className="h-12 w-12 text-[var(--bolt)] opacity-60" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <span className="badge badge-sats">
            <Zap className="h-3 w-3 fill-current" />
            {formatSats(product.priceSats)} sats
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">
            {product.description}
          </p>
        </div>
        <button onClick={() => onBuy(product)} className="btn btn-primary w-full">
          <Zap className="h-4 w-4 fill-current" />
          Buy for {formatSats(product.priceSats)} sats
        </button>
      </div>
    </article>
  );
}