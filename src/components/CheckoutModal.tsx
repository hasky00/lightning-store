"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Zap, Copy, Check, Loader2, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import type { Product } from "@/lib/types";
import { createProductInvoice, payInvoice } from "@/lib/nwc";
import { formatSats, cn } from "@/lib/utils";
import { useWalletStore } from "@/store/walletStore";
import { MerchantWalletSetup } from "./MerchantWalletSetup";
import { toast } from "sonner";

interface CheckoutModalProps {
  product: Product | null;
  onClose: () => void;
}

type Step = "creating" | "ready" | "paying" | "paid" | "needs-merchant" | "error";

export function CheckoutModal({ product, onClose }: CheckoutModalProps) {
  const [invoice, setInvoice] = useState("");
  const [step, setStep] = useState<Step>("creating");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const { buyerUrl, buyerConnected, getEffectiveMerchantUrl, merchantConnected } =
    useWalletStore();

  const createInvoice = useCallback(async () => {
    if (!product) return;

    const merchantUrl = getEffectiveMerchantUrl();

    setStep("creating");
    setError("");
    setInvoice("");

    if (!merchantUrl) {
      setStep("needs-merchant");
      return;
    }

    try {
      const inv = await createProductInvoice(
        merchantUrl,
        product.priceSats,
        `${product.name} — Lightning Store`
      );
      setInvoice(inv);
      setStep("ready");
    } catch (err) {
      setStep("error");
      setError(
        err instanceof Error ? err.message : "Failed to create invoice"
      );
    }
  }, [product, getEffectiveMerchantUrl]);

  useEffect(() => {
    if (!product) return;
    createInvoice();
  }, [product, createInvoice, retryKey]);

  function handleMerchantConfigured() {
    setRetryKey((k) => k + 1);
  }

  async function handlePay() {
    if (!invoice || !buyerUrl) {
      toast.error("Connect your wallet first");
      return;
    }

    setStep("paying");
    try {
      await payInvoice(buyerUrl, invoice);
      setStep("paid");
      toast.success("Payment successful! ⚡");
    } catch (err) {
      setStep("ready");
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  }

  async function copyInvoice() {
    await navigator.clipboard.writeText(invoice);
    setCopied(true);
    toast.success("Invoice copied");
    setTimeout(() => setCopied(false), 2000);
  }

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-6 sm:m-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bolt)]/15">
            <Zap className="h-6 w-6 text-[var(--bolt)] fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{product.name}</h2>
            <p className="text-2xl font-bold text-[var(--bolt)] font-mono">
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

        {step === "needs-merchant" && (
          <div className="space-y-4">
            <div className="warning-box">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Set up a merchant wallet to create invoices and receive sats.
              </p>
            </div>
            <MerchantWalletSetup
              compact
              onConfigured={handleMerchantConfigured}
            />
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="warning-box">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {error}
              </p>
            </div>
            {!merchantConnected && (
              <MerchantWalletSetup
                compact
                onConfigured={handleMerchantConfigured}
              />
            )}
            {merchantConnected && (
              <button onClick={createInvoice} className="btn btn-primary w-full">
                <Zap className="h-4 w-4 fill-current" />
                Try Again
              </button>
            )}
          </div>
        )}

        {(step === "ready" || step === "paying") && invoice && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                BOLT11 Invoice
              </p>
              <p className="break-all font-mono text-xs text-[var(--text-secondary)] line-clamp-3">
                {invoice}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={copyInvoice} className="btn btn-secondary flex-1">
                {copied ? (
                  <Check className="h-4 w-4 text-[var(--success)]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </button>
              <button
                onClick={() => setShowQr(!showQr)}
                className="btn btn-secondary flex-1"
              >
                <QrCode className="h-4 w-4" />
                QR Code
              </button>
            </div>

            {showQr && (
              <div className="qr-container mx-auto">
                <QRCode value={invoice} size={180} />
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={!buyerConnected || step === "paying"}
              className={cn("btn btn-primary w-full", step === "paying" && "opacity-70")}
            >
              {step === "paying" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 fill-current" />
              )}
              {buyerConnected ? "Pay with NWC Wallet" : "Connect Wallet to Pay"}
            </button>
          </div>
        )}

        {step === "paid" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/15">
              <Check className="h-8 w-8 text-[var(--success)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Payment received!</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Thank you for your purchase. Enjoy {product.name}!
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