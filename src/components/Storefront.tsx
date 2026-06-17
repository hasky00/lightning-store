"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { ProductGrid } from "./ProductGrid";
import { CheckoutModal } from "./CheckoutModal";
import { WalletConnectModal } from "./WalletConnectModal";
import { useProductStore } from "@/store/productStore";
import { useWalletStore } from "@/store/walletStore";
import type { Product } from "@/lib/types";
import { Zap } from "lucide-react";

export function Storefront() {
  const products = useProductStore((s) => s.products);
  const storeName = useProductStore((s) => s.settings.storeName);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const seedSamples = useProductStore((s) => s.seedSamples);

  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);

  useEffect(() => {
    seedSamples();
    const unsub = useProductStore.persist.onFinishHydration(() => {
      hydrateWallet();
    });
    if (useProductStore.persist.hasHydrated()) {
      hydrateWallet();
    }
    return unsub;
  }, [hydrateWallet, seedSamples]);

  function handleBuy(product: Product) {
    setCheckoutProduct(product);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header onConnectWallet={() => setWalletOpen(true)} />

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
            Browse products priced in sats. Connect your Alby wallet and pay
            instantly over the Lightning Network.
          </p>
        </section>

        <ProductGrid products={products} onBuy={handleBuy} />
      </main>

      <CheckoutModal
        product={checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
      />
      <WalletConnectModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </div>
  );
}