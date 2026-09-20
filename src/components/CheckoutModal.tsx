"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Zap, Copy, Check, Loader2, Clock, TriangleAlert } from "lucide-react";
import QRCode from "react-qr-code";
import type { Product } from "@/lib/types";
import { ApiRequestError, fetchOrderStatus, startCheckout } from "@/lib/api";
import { payInvoice } from "@/lib/nwc";
import { formatSats, cn } from "@/lib/utils";
import { useWalletStore } from "@/store/walletStore";
import { toast } from "sonner";

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
}

type Step =
  | "creating"
  | "awaiting"
  | "paying"
  | "paid"
  | "expired"
  | "unconfigured"
  | "error";

/** How often to ask the server whether the invoice settled. */
const POLL_INTERVAL_MS = 2500;

/**
 * Checkout.
 *
 * The important property: *this component cannot decide that an order was
 * paid*. It asks the server, which asks the merchant wallet. That is why
 * paying by scanning the QR with any external wallet works exactly as well as
 * paying with a connected one — the confirmation path is the same either way.
 *
 * The parent gives this component a `key` per product, so opening a different
 * product remounts it with fresh state instead of needing an effect to reset.
 */
export function CheckoutModal({ product, onClose }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>("creating");
  const [invoice, setInvoice] = useState("");
  const [orderId, setOrderId] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const walletConnected = useWalletStore((s) => s.connected);
  const walletUrl = useWalletStore((s) => s.url);

  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Create the invoice -------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    startCheckout(product.id)
      .then((order) => {
        if (cancelled) return;
        setInvoice(order.invoice);
        setOrderId(order.orderId);
        setExpiresAt(order.expiresAt);
        setStep("awaiting");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (
          err instanceof ApiRequestError &&
          err.code === "MERCHANT_NOT_CONFIGURED"
        ) {
          setStep("unconfigured");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Could not create an invoice."
        );
        setStep("error");
      });

    return () => {
      cancelled = true;
    };
  }, [product.id, attempt]);

  // --- Poll the server for settlement -------------------------------------
  const polling = step === "awaiting" || step === "paying";

  useEffect(() => {
    if (!polling || !orderId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    async function poll() {
      try {
        const status = await fetchOrderStatus(orderId, controller.signal);
        if (cancelled) return;

        if (status.state === "paid") {
          setStep("paid");
          toast.success("Payment received! ⚡");
          return;
        }
        if (status.state === "expired") {
          setStep("expired");
          return;
        }
        if (status.state === "failed") {
          setError("The payment failed. Try again.");
          setStep("error");
          return;
        }
      } catch {
        // A dropped poll is not a failed payment — the invoice is still
        // outstanding, so keep asking rather than showing a scary error.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [polling, orderId]);

  // --- Countdown ----------------------------------------------------------
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt || step === "paid") return;

    const tick = () =>
      setSecondsLeft(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, step]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const retry = useCallback(() => {
    setStep("creating");
    setError("");
    setInvoice("");
    setOrderId("");
    setAttempt((n) => n + 1);
  }, []);

  async function handlePayWithWallet() {
    if (!invoice || !walletUrl) return;

    setStep("paying");
    try {
      await payInvoice(walletUrl, invoice);
      // Deliberately not setting "paid" here. The wallet says it sent the
      // payment; only the server can confirm the shop received it, and the
      // poll above is already asking.
      toast.success("Payment sent — confirming…");
    } catch (err) {
      setStep("awaiting");
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  }

  async function copyInvoice() {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast.success("Invoice copied");
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the invoice text instead.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-6 sm:m-4">
        <button
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bolt)]/15">
            <Zap className="h-6 w-6 fill-current text-[var(--bolt)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{product.name}</h2>
            <p className="font-mono text-2xl font-bold text-[var(--bolt)]">
              {formatSats(product.priceSats)} sats
            </p>
          </div>
        </div>

        {step === "creating" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--bolt)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              Creating Lightning invoice…
            </p>
          </div>
        )}

        {step === "unconfigured" && (
          <div className="warning-box space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              This store cannot take payments yet.
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Its owner needs to set <code>MERCHANT_NWC_URL</code> in the
              server environment. See <code>.env.example</code>.
            </p>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="warning-box">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {error}
              </p>
            </div>
            <button onClick={retry} className="btn btn-primary w-full">
              <Zap className="h-4 w-4 fill-current" />
              Try Again
            </button>
          </div>
        )}

        {step === "expired" && (
          <div className="space-y-4">
            <div className="warning-box flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
              <p className="text-sm text-[var(--text-primary)]">
                This invoice expired before it was paid. Nothing was charged.
              </p>
            </div>
            <button onClick={retry} className="btn btn-primary w-full">
              <Zap className="h-4 w-4 fill-current" />
              Get a New Invoice
            </button>
          </div>
        )}

        {(step === "awaiting" || step === "paying") && invoice && (
          <div className="space-y-4">
            <div className="qr-container mx-auto w-fit bg-white p-3">
              <QRCode value={invoice.toUpperCase()} size={180} />
            </div>

            <p className="text-center text-sm text-[var(--text-secondary)]">
              Scan with any Lightning wallet, or pay with your connected one.
            </p>

            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                BOLT11 Invoice
              </p>
              <p className="line-clamp-3 break-all font-mono text-xs text-[var(--text-secondary)]">
                {invoice}
              </p>
            </div>

            <button onClick={copyInvoice} className="btn btn-secondary w-full">
              {copied ? (
                <Check className="h-4 w-4 text-[var(--success)]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy Invoice"}
            </button>

            {walletConnected && (
              <button
                onClick={handlePayWithWallet}
                disabled={step === "paying"}
                className={cn(
                  "btn btn-primary w-full",
                  step === "paying" && "opacity-70"
                )}
              >
                {step === "paying" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 fill-current" />
                )}
                {step === "paying" ? "Confirming…" : "Pay with Connected Wallet"}
              </button>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for payment
              {secondsLeft !== null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatCountdown(secondsLeft)}
                </span>
              )}
            </div>
          </div>
        )}

        {step === "paid" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/15">
              <Check className="h-8 w-8 text-[var(--success)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Payment confirmed!</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                The shop received your sats. Enjoy {product.name}!
              </p>
            </div>
            <button onClick={onClose} className="btn btn-primary w-full">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
