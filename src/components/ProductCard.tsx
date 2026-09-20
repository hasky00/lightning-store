"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import type { ProductListing } from "@/lib/types";
import { formatSats, cn } from "@/lib/utils";

interface ProductCardProps {
  product: ProductListing;
  onBuy: (product: ProductListing) => void;
}

const PLACEHOLDER_GRADIENTS = [
  "from-amber-400/30 to-orange-600/20",
  "from-violet-400/30 to-purple-600/20",
  "from-sky-400/30 to-blue-600/20",
  "from-emerald-400/30 to-teal-600/20",
  "from-rose-400/30 to-pink-600/20",
  "from-yellow-400/30 to-amber-600/20",
];

/**
 * Hash the whole id, not just its first character: ids that share a prefix
 * (every seeded product starts "seed-") would otherwise all pick the same
 * colour and the grid would look like one flat block.
 */
function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1_000_000_007;
  }
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}

/** Only worth mentioning when it might actually influence a decision. */
function stockNotice(product: ProductListing): string | null {
  if (product.available === null || product.soldOut) return null;
  if (product.available <= 3) {
    return product.available === 1 ? "Last one" : `Only ${product.available} left`;
  }
  return null;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  const notice = stockNotice(product);

  return (
    <article className="card group flex flex-col overflow-hidden">
      <Link
        href={`/p/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-[var(--surface-2)]"
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105",
              product.soldOut && "opacity-50 grayscale"
            )}
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              getGradient(product.id),
              product.soldOut && "opacity-50 grayscale"
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

        {product.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/75 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white">
              Sold out
            </span>
          </div>
        )}

        {notice && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-full bg-[var(--warning)] px-2.5 py-1 text-xs font-bold text-[#0a0a0f]">
              {notice}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <h3 className="line-clamp-1 font-semibold text-[var(--text-primary)]">
            <Link href={`/p/${product.id}`} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
            {product.description}
          </p>
        </div>
        <button
          onClick={() => onBuy(product)}
          disabled={product.soldOut}
          className="btn btn-primary w-full"
        >
          <Zap className="h-4 w-4 fill-current" />
          {product.soldOut
            ? "Sold out"
            : `Buy for ${formatSats(product.priceSats)} sats`}
        </button>
      </div>
    </article>
  );
}
