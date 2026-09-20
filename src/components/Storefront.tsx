"use client";

import { useCallback, useEffect, useState } from "react";
import { Zap, Loader2, TriangleAlert } from "lucide-react";
import { Header } from "./Header";
import { ProductGrid } from "./ProductGrid";
import { CheckoutModal } from "./CheckoutModal";
import { WalletConnectModal } from "./WalletConnectModal";
import { useWalletStore } from "@/store/walletStore";
import { fetchProducts, fetchSettings } from "@/lib/api";
import { DEFAULT_STORE_NAME } from "@/lib/constants";
import type { Product } from "@/lib/types";

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeName, setStoreName] = useState(DEFAULT_STORE_NAME);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);

  const hydrateWallet = useWalletStore((s) => s.hydrate);

  useEffect(() => {
    hydrateWallet();
  }, [hydrateWallet]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchProducts(), fetchSettings()])
      .then(([loadedProducts, settings]) => {
        if (cancelled) return;
        setProducts(loadedProducts);
        setStoreName(settings.storeName);
        setLoadError("");
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load the store."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retryLoad = useCallback(() => {
    setLoading(true);
    setLoadError("");
    setReloadKey((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header storeName={storeName} onConnectWallet={() => setWalletOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--bolt)]">
            <Zap className="h-3.5 w-3.5 fill-current" />
            Powered by Lightning &amp; NWC
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {storeName}
          </h1>
          <p className="mt-2 max-w-xl text-[var(--text-secondary)]">
            Browse products priced in sats. Pay with any Lightning wallet —
            scan the invoice, or connect yours for one-tap checkout.
          </p>
        </section>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--bolt)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              Loading products…
            </p>
          </div>
        )}

        {!loading && loadError && (
          <div className="empty-state">
            <TriangleAlert className="mx-auto h-10 w-10 text-[var(--warning)]" />
            <h3 className="mt-4 text-lg font-semibold">
              Could not load the store
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {loadError}
            </p>
            <button onClick={retryLoad} className="btn btn-primary mt-4">
              Try Again
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <ProductGrid products={products} onBuy={setCheckoutProduct} />
        )}
      </main>

      {checkoutProduct && (
        <CheckoutModal
          // Remounting per product gives each checkout clean state, with no
          // effect needed to reset the previous order.
          key={checkoutProduct.id}
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
        />
      )}
      <WalletConnectModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
      />
    </div>
  );
}
