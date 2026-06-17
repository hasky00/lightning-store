"use client";

import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { PackageOpen } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  onBuy: (product: Product) => void;
}

export function ProductGrid({ products, onBuy }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="empty-state col-span-full">
        <PackageOpen className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Head to Admin to add your first product with sats pricing.
        </p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onBuy={onBuy} />
      ))}
    </div>
  );
}