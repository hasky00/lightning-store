"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Zap, Settings } from "lucide-react";
import { ProductForm } from "./ProductForm";
import { MerchantWalletSetup } from "./MerchantWalletSetup";
import { useProductStore } from "@/store/productStore";
import { useWalletStore } from "@/store/walletStore";
import { formatSats } from "@/lib/utils";
import { toast } from "sonner";

export function AdminPanel() {
  const { products, settings, updateSettings, deleteProduct } = useProductStore();
  const { hydrate, disconnectMerchant, merchantConnected } = useWalletStore();

  const [storeName, setStoreName] = useState(settings.storeName);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setStoreName(settings.storeName);
  }, [settings.storeName]);

  function saveSettings() {
    updateSettings({ storeName });
    toast.success("Settings saved");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to Store
          </Link>
          <h1 className="text-sm font-bold text-[var(--text-primary)]">Admin</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <ProductForm />

            <div className="card space-y-5 p-6">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[var(--bolt)]" />
                <h2 className="text-lg font-bold">Store Settings</h2>
              </div>

              <div>
                <label className="label" htmlFor="storeName">
                  Store Name
                </label>
                <input
                  id="storeName"
                  className="input"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>

              <MerchantWalletSetup />

              {merchantConnected && (
                <button
                  onClick={disconnectMerchant}
                  className="btn btn-secondary w-full"
                >
                  Disconnect Merchant Wallet
                </button>
              )}

              <button onClick={saveSettings} className="btn btn-secondary w-full">
                Save Store Name
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold">
              Products ({products.length})
            </h2>
            {products.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No products yet. Add one using the form.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-2)]">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Zap className="h-5 w-5 text-[var(--bolt)]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="font-mono text-sm text-[var(--bolt)]">
                        {formatSats(p.priceSats)} sats
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        deleteProduct(p.id);
                        toast.success("Product removed");
                      }}
                      className="btn btn-ghost shrink-0 text-[var(--error)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}