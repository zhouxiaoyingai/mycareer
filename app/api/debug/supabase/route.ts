import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(_req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing)";
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const stages: Array<{ stage: string; ms: number; info: unknown }> = [];
  const t0 = Date.now();
  const tick = (stage: string, info: unknown = null) =>
    stages.push({ stage, ms: Date.now() - t0, info });

  tick("env-loaded", { url, hasAnon, hasService, region: process.env.VERCEL_REGION });

  // Stage 1: DNS resolve
  try {
    const u = new URL(url);
    const dnsMod = await import("node:dns/promises");
    tick("dns-start", { host: u.hostname });
    const addrs = await Promise.race([
      dnsMod.lookup(u.hostname, { all: true }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("dns-timeout-3s")), 3000)),
    ]);
    tick("dns-ok", addrs);
  } catch (e) {
    tick("dns-fail", { msg: e instanceof Error ? e.message : String(e) });
  }

  // Stage 2: TCP connect (raw)
  try {
    const u = new URL(url);
    const net = await import("node:net");
    tick("tcp-start", { port: 443, host: u.hostname });
    const tcpOk = await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ host: u.hostname, port: 443, family: 4 });
      const timer = setTimeout(() => { sock.destroy(); resolve(false); }, 5000);
      sock.once("connect", () => { clearTimeout(timer); sock.end(); resolve(true); });
      sock.once("error", (err) => { clearTimeout(timer); resolve(false); });
    });
    tick("tcp-result", { ok: tcpOk });
  } catch (e) {
    tick("tcp-fail", { msg: e instanceof Error ? e.message : String(e) });
  }

  // Stage 3: HTTPS via global fetch with short timeout
  try {
    tick("fetch-start");
    const r = await Promise.race([
      fetch(`${url}/auth/v1/health`, { signal: AbortSignal.timeout(4000) }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("fetch-timeout-5s")), 5000)),
    ]);
    tick("fetch-ok", { status: (r as Response).status });
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    tick("fetch-fail", {
      msg: err.message,
      cause: err.cause ? (err.cause as Error).message ?? String(err.cause) : null,
      code: (err.cause as { code?: string })?.code,
    });
  }

  return Response.json({ stages }, { status: 200 });
}
