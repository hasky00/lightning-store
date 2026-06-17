"use client";

import Link from "next/link";
import { Zap, Wallet, Settings, Store } from "lucide-react";
import { useWalletStore } from "@/store/walletStore";
import { useProductStore } from "@/store/productStore";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onConnectWallet?: () => void;
}

export function Header({ onConnectWallet }: HeaderProps) {
  const { buyerConnected } = useWalletStore();
  const storeName = useProductStore((s) => s.settings.storeName);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bolt)] text-white shadow-[0_0_20px_rgba(247,147,26,0.35)]">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              {storeName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">Pay with Lightning</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="btn btn-ghost hidden sm:inline-flex"
          >
            <Store className="h-4 w-4" />
            Shop
          </Link>
          <Link href="/admin" className="btn btn-ghost hidden sm:inline-flex">
            <Settings className="h-4 w-4" />
            Admin
          </Link>

          <button
            onClick={onConnectWallet}
            className={cn(
              "btn",
              buyerConnected ? "btn-secondary" : "btn-primary"
            )}
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden xs:inline">
              {buyerConnected ? "Wallet Connected" : "Connect Wallet"}
            </span>
            <span className="xs:hidden">
              {buyerConnected ? "Connected" : "Connect"}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}