import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Boots a real server with a mock wallet and a throwaway data directory, so
 * tests exercise the actual HTTP surface rather than mocks of it — and never
 * touch a developer's real catalogue.
 */

export const ADMIN_PASSWORD = "test-admin-password-1234";
export const SIGNING_SECRET = "0".repeat(64);

/**
 * Asks the OS for a free port rather than hard-coding one, so a stray process
 * (or a developer's own dev server) cannot make the whole suite fail with
 * EADDRINUSE.
 */
async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

export async function startServer({ port } = {}) {
  port ??= await freePort();
  const workdir = await mkdtemp(path.join(tmpdir(), "lightning-store-test-"));

  // Deliberately the dev server, not `next start`. The mock wallet refuses to
  // run under NODE_ENV=production, and that guard is worth more than a faster
  // test run -- so the tests live where the guard allows them rather than
  // adding a bypass to production code for the convenience of tests.
  const child = spawn(
    "npx",
    ["next", "dev", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Its own build directory, so the suite can run alongside a dev
        // server instead of colliding with its single-instance lock.
        NEXT_DIST_DIR: ".next-test",
        MOCK_WALLET: "1",
        MOCK_SETTLE_SECONDS: "0",
        ORDER_SIGNING_SECRET: SIGNING_SECRET,
        ADMIN_PASSWORD,
        STORE_DATA_DIR: workdir,
      },
      stdio: ["ignore", "pipe", "pipe"],
      // Its own process group: `next dev` spawns a server child of its own,
      // and signalling only the wrapper leaves that child running -- which
      // hangs the test run forever after the last assertion passes.
      detached: true,
    }
  );

  const logs = [];
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early:\n${logs.join("")}`);
    }
    try {
      const res = await fetch(`${base}/api/settings`);
      if (res.ok) {
        return {
          base,
          async stop() {
            await stopTree(child);
            await rm(workdir, { recursive: true, force: true });
          },
          logs,
        };
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  await stopTree(child);
  throw new Error(`Server did not start in time:\n${logs.join("")}`);
}

/** Minimal cookie-aware fetch, so session behaviour is genuinely tested. */
export function createClient(base) {
  const cookies = new Map();

  return {
    cookies,
    async request(path, options = {}) {
      const headers = { ...(options.headers ?? {}) };
      if (options.body) headers["Content-Type"] = "application/json";
      if (cookies.size > 0) {
        headers.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
      }

      const res = await fetch(`${base}${path}`, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        redirect: "manual",
      });

      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(";");
        const index = pair.indexOf("=");
        const name = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (value === "" ) cookies.delete(name);
        else cookies.set(name, value);
      }

      let body = null;
      try {
        body = await res.json();
      } catch {
        // some responses have no body
      }

      return { status: res.status, body, headers: res.headers };
    },
  };
}

/**
 * Signals the whole process group and waits for it to actually die. Both
 * halves matter: the group so no child survives, and the wait so the temp
 * directory is not removed out from under a server still writing to it.
 */
async function stopTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exited = new Promise((resolve) => child.once("exit", resolve));

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }

  const timedOut = await Promise.race([
    exited.then(() => false),
    new Promise((r) => setTimeout(() => r(true), 5000)),
  ]);

  if (timedOut) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
    await exited;
  }
}
