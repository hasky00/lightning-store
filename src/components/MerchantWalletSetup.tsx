"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { NwcConnectPanel } from "./NwcConnectPanel";
import { useWalletStore } from "@/store/walletStore";
import { useProductStore } from "@/store/productStore";
import { saveNwcUrl } from "@/lib/nwc";
import { toast } from "sonner";

interface MerchantWalletSetupProps {
  onConfigured?: () => void;
  compact?: boolean;
}

export function MerchantWalletSetup({
  onConfigured,
  compact = false,
}: MerchantWalletSetupProps) {
  const {
    connecting,
    connectMerchant,
    buyerUrl,
    merchantConnected,
    setMerchantUrl,
    disconnectMerchant,
  } = useWalletStore();
  const updateSettings = useProductStore((s) => s.updateSettings);
  const settingsUrl = useProductStore((s) => s.settings.merchantNwcUrl);

  const [manualNwc, setManualNwc] = useState(settingsUrl);

  function persistMerchant(url: string) {
    saveNwcUrl("merchant", url);
    setMerchantUrl(url);
    updateSettings({ merchantNwcUrl: url });
    setManualNwc(url);
    toast.success("Merchant wallet saved!");
    onConfigured?.();
  }

  async function handleConnect(hubUrl: string) {
    const url = await connectMerchant(hubUrl);
    setManualNwc(url);
    toast.success("Merchant wallet connected!");
    onConfigured?.();
  }

  function useBuyerAsMerchant() {
    if (!buyerUrl) return;
    persistMerchant(buyerUrl);
    toast.success("Using your buyer wallet to receive payments");
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            Configure Merchant Wallet
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Connect a wallet with{" "}
            <code className="text-[var(--bolt)]">make_invoice</code> permission so
            this store can create Lightning invoices.
          </p>
        </div>
      )}

      {merchantConnected && (
        <div className="badge badge-success w-full justify-center py-2">
          <Check className="h-3.5 w-3.5" />
          Merchant wallet configured
        </div>
      )}

      {buyerUrl && !merchantConnected && (
        <button onClick={useBuyerAsMerchant} className="btn btn-secondary w-full">
          <Link2 className="h-4 w-4" />
          Use connected buyer wallet
        </button>
      )}

      <NwcConnectPanel
        role="merchant"
        connected={merchantConnected}
        connecting={connecting === "merchant"}
        nwcUrl={manualNwc}
        onNwcUrlChange={setManualNwc}
        onConnect={handleConnect}
        onSaveManual={persistMerchant}
        onDisconnect={disconnectMerchant}
      />
    </div>
  );
}