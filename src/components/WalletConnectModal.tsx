"use client";

import { useCallback, useState } from "react";
import { X, Wallet } from "lucide-react";
import { NwcConnectPanel } from "./NwcConnectPanel";
import { useModal } from "@/lib/use-modal";
import { useWalletStore } from "@/store/walletStore";
import { toast } from "sonner";

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ open, onClose }: WalletConnectModalProps) {
  const { connected, url, connecting, connect, disconnect, setUrl } =
    useWalletStore();
  const [manualNwc, setManualNwc] = useState(url || "");
  const handleClose = useCallback(() => onClose(), [onClose]);
  const dialogRef = useModal<HTMLDivElement>(handleClose, open);

  if (!open) return null;

  async function handleConnect(hubUrl: string) {
    await connect(hubUrl);
    toast.success("Wallet connected!");
    onClose();
  }

  function handleSaveManual(nwcUrl: string) {
    setUrl(nwcUrl);
    setManualNwc(nwcUrl);
    toast.success("Wallet saved!");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-title"
        tabIndex={-1}
        className="modal relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-6 sm:m-4"
      >
        <button
          onClick={onClose}
          aria-label="Close wallet settings"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bolt)] text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 id="wallet-title" className="text-lg font-bold">
              Connect Wallet
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Optional — you can also just scan the invoice at checkout.
            </p>
          </div>
        </div>

        <NwcConnectPanel
          connected={connected}
          connecting={connecting}
          nwcUrl={manualNwc}
          onNwcUrlChange={setManualNwc}
          onConnect={handleConnect}
          onSaveManual={handleSaveManual}
          onDisconnect={disconnect}
        />
      </div>
    </div>
  );
}
