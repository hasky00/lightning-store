"use client";

import { useState } from "react";
import { X, Wallet } from "lucide-react";
import { NwcConnectPanel } from "./NwcConnectPanel";
import { useWalletStore } from "@/store/walletStore";
import { toast } from "sonner";

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ open, onClose }: WalletConnectModalProps) {
  const {
    buyerConnected,
    buyerUrl,
    connecting,
    connectBuyer,
    disconnectBuyer,
    setBuyerUrl,
  } = useWalletStore();

  const [manualNwc, setManualNwc] = useState(buyerUrl || "");

  if (!open) return null;

  async function handleConnect(hubUrl: string) {
    await connectBuyer(hubUrl);
    toast.success("Wallet connected!");
    onClose();
  }

  function handleSaveManual(url: string) {
    setBuyerUrl(url);
    setManualNwc(url);
    toast.success("Wallet saved!");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="modal relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-6 sm:m-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bolt)] text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Connect Wallet</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Pay instantly with Alby NWC
            </p>
          </div>
        </div>

        <NwcConnectPanel
          role="buyer"
          connected={buyerConnected}
          connecting={connecting === "buyer"}
          nwcUrl={manualNwc}
          onNwcUrlChange={setManualNwc}
          onConnect={handleConnect}
          onSaveManual={handleSaveManual}
          onDisconnect={disconnectBuyer}
        />
      </div>
    </div>
  );
}