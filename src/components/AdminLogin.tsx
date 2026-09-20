"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { ApiRequestError, signIn } from "@/lib/api";

interface AdminLoginProps {
  onSignedIn: () => void;
}

export function AdminLogin({ onSignedIn }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!password) return;

    setBusy(true);
    setError("");
    try {
      await signIn(password);
      onSignedIn();
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === "MERCHANT_NOT_CONFIGURED"
          ? "No admin password is set on the server. Add ADMIN_PASSWORD to .env.local."
          : "Incorrect password."
      );
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bolt)]/15">
            <Lock className="h-5 w-5 text-[var(--bolt)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Sign in to manage the shop.
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>

        {error && (
          <div className="warning-box">
            <p className="text-sm text-[var(--text-primary)]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !password}
          className="btn btn-primary w-full"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign In
        </button>
      </form>
    </div>
  );
}
