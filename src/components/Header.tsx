"use client";

import Link from "next/link";
import { Zap, Wallet, Settings, Store } from "lucide-react";
import { useWalletStore } from "@/store/walletStore";
import { cn } from "@/lib/utils";

interface HeaderProps {
  storeName: string;
  onConnectWallet?: () => void;
}

export function Header({ storeName, onConnectWallet }: HeaderProps) {
  const connected = useWalletStore((s) => s.connected);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bolt)] text-white shadow-[0_0_20px_rgba(247,147,26,0.35)]">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              {storeName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Pay with Lightning
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {/*
            The hiding lives on this wrapper rather than on the links
            themselves: `.btn` sets `display: inline-flex` from unlayered CSS,
            which outranks Tailwind's layered `hidden` utility, so `hidden` on
            a `.btn` element silently does nothing.
          */}
          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/" className="btn btn-ghost">
              <Store className="h-4 w-4" />
              Shop
            </Link>
            <Link href="/admin" className="btn btn-ghost">
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          </div>

          {/* Same wrapper trick, so phones keep a way into the admin area. */}
          <div className="flex sm:hidden">
            <Link href="/admin" aria-label="Admin" className="btn btn-ghost">
              <Settings className="h-4 w-4" />
            </Link>
          </div>

          <button
            onClick={onConnectWallet}
            className={cn("btn", connected ? "btn-secondary" : "btn-primary")}
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">
              {connected ? "Wallet Connected" : "Connect Wallet"}
            </span>
            <span className="sm:hidden">
              {connected ? "Connected" : "Connect"}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
