"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Zap,
  Settings,
  Loader2,
  LogOut,
  Wallet,
  Pencil,
  Package,
  Boxes,
} from "lucide-react";
import { ProductForm } from "./ProductForm";
import { AdminLogin } from "./AdminLogin";
import { OrdersTable } from "./OrdersTable";
import {
  deleteProduct as deleteProductRequest,
  fetchOrders,
  fetchProducts,
  fetchSettings,
  fetchSignedIn,
  signOut,
  updateStoreName,
} from "@/lib/api";
import { DEFAULT_STORE_NAME } from "@/lib/constants";
import type { Order, Product, ProductListing } from "@/lib/types";
import { formatSats, cn } from "@/lib/utils";
import { toast } from "sonner";

type AuthState = "checking" | "signed-out" | "signed-in";
type Tab = "catalogue" | "orders";

export function AdminPanel() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [tab, setTab] = useState<Tab>("catalogue");
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeName, setStoreName] = useState(DEFAULT_STORE_NAME);
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSignedIn()
      .then((signedIn) => {
        if (!cancelled) setAuth(signedIn ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (!cancelled) setAuth("signed-out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(() => {
    Promise.all([fetchProducts(), fetchSettings(), fetchOrders()])
      .then(([loadedProducts, settings, loadedOrders]) => {
        setProducts(loadedProducts);
        setStoreName(settings.storeName);
        setOrders(loadedOrders);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Could not load the shop"
        );
      });
  }, []);

  useEffect(() => {
    if (auth !== "signed-in") return;
    loadData();
  }, [auth, loadData]);

  const awaitingFulfilment = orders.filter(
    (o) => o.state === "paid" && !o.fulfilledAt
  ).length;

  async function handleSaveName() {
    setSavingName(true);
    try {
      const settings = await updateStoreName(storeName);
      setStoreName(settings.storeName);
      toast.success("Store name saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the name"
      );
    } finally {
      setSavingName(false);
    }
  }

  async function handleDelete(product: Product) {
    setDeleting(product.id);
    try {
      await deleteProductRequest(product.id);
      setProducts((current) => current.filter((p) => p.id !== product.id));
      if (editing?.id === product.id) setEditing(null);
      toast.success(`Removed ${product.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the product"
      );
    } finally {
      setDeleting(null);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      setAuth("signed-out");
    }
  }

  function handleSaved() {
    setEditing(null);
    // Availability depends on live orders, so re-read rather than patching
    // the row locally and risking a stale "in stock".
    loadData();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Store</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-[var(--text-primary)]">
              Admin
            </h1>
            {auth === "signed-in" && (
              <button onClick={handleSignOut} className="btn btn-ghost">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {auth === "checking" && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--bolt)]" />
          </div>
        )}

        {auth === "signed-out" && (
          <AdminLogin onSignedIn={() => setAuth("signed-in")} />
        )}

        {auth === "signed-in" && (
          <>
            <div className="mb-6 flex gap-2" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "catalogue"}
                onClick={() => setTab("catalogue")}
                className={cn(
                  "btn",
                  tab === "catalogue" ? "btn-primary" : "btn-secondary"
                )}
              >
                <Boxes className="h-4 w-4" />
                Catalogue
              </button>
              <button
                role="tab"
                aria-selected={tab === "orders"}
                onClick={() => setTab("orders")}
                className={cn(
                  "btn",
                  tab === "orders" ? "btn-primary" : "btn-secondary"
                )}
              >
                <Package className="h-4 w-4" />
                Orders
                {awaitingFulfilment > 0 && (
                  <span className="ml-1 rounded-full bg-[var(--bolt)] px-2 py-0.5 text-xs font-bold text-[#0a0a0f]">
                    {awaitingFulfilment}
                  </span>
                )}
              </button>
            </div>

            {tab === "orders" && (
              <OrdersTable
                orders={orders}
                onChanged={(updated) =>
                  setOrders((current) =>
                    current.map((o) => (o.id === updated.id ? updated : o))
                  )
                }
              />
            )}

            {tab === "catalogue" && (
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <ProductForm
                    // Remounting per edited product resets the fields without
                    // an effect syncing props into state.
                    key={editing?.id ?? "new"}
                    product={editing ?? undefined}
                    onSaved={handleSaved}
                    onCancel={editing ? () => setEditing(null) : undefined}
                  />

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
                        maxLength={60}
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="btn btn-secondary w-full"
                    >
                      {savingName && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Save Store Name
                    </button>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <Wallet className="h-4 w-4 text-[var(--bolt)]" />
                        Merchant wallet
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Configured on the server via{" "}
                        <code className="text-[var(--bolt)]">
                          MERCHANT_NWC_URL
                        </code>
                        , not here. Keeping it out of the browser is what stops
                        a visitor from ever reading the shop&apos;s wallet key.
                      </p>
                    </div>
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
                            <p className="text-xs text-[var(--text-muted)]">
                              {p.stock === null
                                ? "Unlimited stock"
                                : p.soldOut
                                  ? "Sold out"
                                  : `${p.available} of ${p.stock} available`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => setEditing(p)}
                              aria-label={`Edit ${p.name}`}
                              className="btn btn-ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              disabled={deleting === p.id}
                              aria-label={`Remove ${p.name}`}
                              className="btn btn-ghost text-[var(--error)]"
                            >
                              {deleting === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
