"use client";

import { useState } from "react";
import { Check, Loader2, Mail, Package, PackageCheck, Clock } from "lucide-react";
import type { Order } from "@/lib/types";
import { setOrderFulfilled } from "@/lib/api";
import { formatSats, cn } from "@/lib/utils";
import { toast } from "sonner";

interface OrdersTableProps {
  orders: Order[];
  onChanged: (order: Order) => void;
}

const STATE_STYLES: Record<Order["state"], string> = {
  paid: "text-[var(--success)]",
  pending: "text-[var(--warning)]",
  expired: "text-[var(--text-muted)]",
  failed: "text-[var(--error)]",
};

export function OrdersTable({ orders, onChanged }: OrdersTableProps) {
  const [busy, setBusy] = useState<string | null>(null);

  // Unpaid orders are noise for a shopkeeper packing parcels, so the default
  // view is the work: paid orders that have not been sent yet.
  const [showAll, setShowAll] = useState(false);
  const toFulfil = orders.filter((o) => o.state === "paid" && !o.fulfilledAt);
  const visible = showAll ? orders : toFulfil;

  async function toggle(order: Order) {
    setBusy(order.id);
    try {
      const updated = await setOrderFulfilled(order.id, !order.fulfilledAt);
      onChanged(updated);
      toast.success(
        updated.fulfilledAt ? "Marked as sent" : "Marked as not sent"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the order"
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {showAll ? `All orders (${orders.length})` : `To send (${toFulfil.length})`}
        </h2>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="btn btn-secondary"
        >
          {showAll ? "Show only unsent" : "Show all orders"}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {showAll
              ? "No orders yet. They appear here as soon as someone buys."
              : "Nothing waiting to be sent. "}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {visible.map((order) => (
            <li key={order.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-sm font-semibold text-[var(--bolt)]">
                      {order.reference}
                    </code>
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wide",
                        STATE_STYLES[order.state]
                      )}
                    >
                      {order.state}
                    </span>
                    {order.fulfilledAt && (
                      <span className="badge badge-success">
                        <Check className="h-3 w-3" />
                        Sent
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate font-semibold text-[var(--text-primary)]">
                    {order.productName}
                  </p>
                  <p className="font-mono text-sm text-[var(--bolt)]">
                    {formatSats(order.priceSats)} sats
                  </p>

                  {order.contact?.email && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <Mail className="h-3 w-3 shrink-0" />
                      <a
                        href={`mailto:${order.contact.email}`}
                        className="truncate underline"
                      >
                        {order.contact.email}
                      </a>
                    </p>
                  )}
                  {order.contact?.note && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                      {order.contact.note}
                    </p>
                  )}

                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Clock className="h-3 w-3" />
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                {order.state === "paid" && (
                  <button
                    onClick={() => toggle(order)}
                    disabled={busy === order.id}
                    className={cn(
                      "btn shrink-0",
                      order.fulfilledAt ? "btn-ghost" : "btn-primary"
                    )}
                  >
                    {busy === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    {order.fulfilledAt ? "Undo" : "Mark sent"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
