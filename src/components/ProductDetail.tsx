"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Package } from "lucide-react";
import { Header } from "./Header";
import { CheckoutModal } from "./CheckoutModal";
import { WalletConnectModal } from "./WalletConnectModal";
import { useWalletStore } from "@/store/walletStore";
import type { ProductListing } from "@/lib/types";
import { formatSats, cn } from "@/lib/utils";

interface ProductDetailProps {
  product: ProductListing;
  storeName: string;
}

export function ProductDetail({ product, storeName }: ProductDetailProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const hydrateWallet = useWalletStore((s) => s.hydrate);

  useEffect(() => {
    hydrateWallet();
  }, [hydrateWallet]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header storeName={storeName} onConnectWallet={() => setWalletOpen(true)} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="btn btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={product.name}
                className={cn(
                  "aspect-square w-full object-cover",
                  product.soldOut && "opacity-50 grayscale"
                )}
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-amber-400/20 to-orange-600/10">
                <Zap className="h-20 w-20 text-[var(--bolt)] opacity-50" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {product.name}
              </h1>
              <p className="mt-2 font-mono text-3xl font-bold text-[var(--bolt)]">
                {formatSats(product.priceSats)} sats
              </p>
            </div>

            {product.description && (
              <p className="whitespace-pre-wrap text-[var(--text-secondary)]">
                {product.description}
              </p>
            )}

            <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Package className="h-4 w-4 text-[var(--text-muted)]" />
              {product.stock === null
                ? "Made to order"
                : product.soldOut
                  ? "Sold out"
                  : `${product.available} in stock`}
            </p>

            <button
              onClick={() => setCheckoutOpen(true)}
              disabled={product.soldOut}
              className="btn btn-primary w-full sm:w-auto"
            >
              <Zap className="h-4 w-4 fill-current" />
              {product.soldOut
                ? "Sold out"
                : `Buy for ${formatSats(product.priceSats)} sats`}
            </button>

            <p className="text-xs text-[var(--text-muted)]">
              Pay with any Lightning wallet. Nothing is charged until you pay
              the invoice.
            </p>
          </div>
        </div>
      </main>

      {checkoutOpen && (
        <CheckoutModal
          product={product}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
      <WalletConnectModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
      />
    </div>
  );
}
