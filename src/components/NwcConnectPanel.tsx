"use client";

import { useEffect, useState } from "react";
import { Wallet, Loader2, ExternalLink, Check, ClipboardPaste } from "lucide-react";
import { loadHubUrl, saveHubUrl, DEFAULT_HUB_URL, HUB_CONNECTIONS_URL } from "@/lib/nwc";
import { toast } from "sonner";

interface NwcConnectPanelProps {
  role: "buyer" | "merchant";
  connected: boolean;
  connecting: boolean;
  nwcUrl: string;
  onNwcUrlChange: (url: string) => void;
  onConnect: (hubUrl: string) => Promise<void>;
  onSaveManual: (url: string) => void;
  onDisconnect?: () => void;
}

const ROLE_COPY = {
  merchant: {
    permissions: "make_invoice",
    action: "receive payments and create invoices",
  },
  buyer: {
    permissions: "pay_invoice",
    action: "send Lightning payments",
  },
};

export function NwcConnectPanel({
  role,
  connected,
  connecting,
  nwcUrl,
  onNwcUrlChange,
  onConnect,
  onSaveManual,
  onDisconnect,
}: NwcConnectPanelProps) {
  const [hubUrl, setHubUrl] = useState(DEFAULT_HUB_URL);
  const copy = ROLE_COPY[role];

  useEffect(() => {
    setHubUrl(loadHubUrl());
  }, []);

  async function handleConnect() {
    const trimmed = hubUrl.trim();
    if (!trimmed.startsWith("http")) {
      toast.error("Enter a valid Alby Hub URL (e.g. https://my.albyhub.com)");
      return;
    }
    saveHubUrl(trimmed);
    try {
      await onConnect(trimmed);
    } catch {
      toast.error(
        "Connection failed. Try pasting your NWC URL manually from Alby Hub → Connections."
      );
    }
  }

  function handleManualSave() {
    const trimmed = nwcUrl.trim();
    if (!trimmed.startsWith("nostr+walletconnect://")) {
      toast.error("Paste a valid nostr+walletconnect:// URL");
      return;
    }
    onSaveManual(trimmed);
  }

  return (
    <div className="space-y-4">
      {connected && (
        <div className="badge badge-success w-full justify-center py-2">
          <Check className="h-3.5 w-3.5" />
          Wallet connected
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text-secondary)]">
        <p className="font-semibold text-[var(--text-primary)]">
          Option A — Connect via Alby Hub
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
          <li>
            Open{" "}
            <a
              href={HUB_CONNECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--bolt)] underline"
            >
              my.albyhub.com
            </a>{" "}
            and log in
          </li>
          <li>Go to Connections → Add Connection</li>
          <li>
            Enable <code className="text-[var(--bolt)]">{copy.permissions}</code>{" "}
            permission
          </li>
          <li>Copy the connection string and paste below (Option B)</li>
        </ol>
      </div>

      <div>
        <label className="label" htmlFor={`hub-${role}`}>
          Alby Hub URL
        </label>
        <input
          id={`hub-${role}`}
          className="input font-mono text-sm"
          value={hubUrl}
          onChange={(e) => setHubUrl(e.target.value)}
          placeholder={DEFAULT_HUB_URL}
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Cloud users: use <code>https://my.albyhub.com</code>
        </p>
      </div>

      <button
        onClick={handleConnect}
        disabled={connecting}
        className="btn btn-primary w-full"
      >
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        Connect via Alby Hub
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--surface)] px-2 text-[var(--text-muted)]">
            Option B — paste NWC URL
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <ClipboardPaste className="h-3.5 w-3.5" />
          Paste from Alby Hub → Connections
        </p>
        <textarea
          className="input min-h-[72px] resize-y font-mono text-xs"
          value={nwcUrl}
          onChange={(e) => onNwcUrlChange(e.target.value)}
          placeholder="nostr+walletconnect://pubkey?relay=…&secret=…"
        />
      </div>

      <button onClick={handleManualSave} className="btn btn-secondary w-full">
        Save NWC Connection
      </button>

      <a
        href={HUB_CONNECTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost w-full text-xs"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open Alby Hub Connections
      </a>

      {connected && onDisconnect && (
        <button onClick={onDisconnect} className="btn btn-ghost w-full text-[var(--error)]">
          Disconnect
        </button>
      )}
    </div>
  );
}