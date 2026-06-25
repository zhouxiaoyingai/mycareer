import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(_req: NextRequest) {
  const stages: Array<{ stage: string; ms: number; info: unknown }> = [];
  const t0 = Date.now();
  const tick = (stage: string, info: unknown = null) =>
    stages.push({ stage, ms: Date.now() - t0, info });

  tick("start");
  tick("env-region", { region: process.env.VERCEL_REGION, env: process.env.NODE_ENV });

  // Test A: hit Google (sanity check - can Vercel function make outbound calls at all?)
  try {
    tick("google-start");
    const r = await Promise.race([
      fetch("https://www.google.com/generate_204", {
        signal: AbortSignal.timeout(4000),
        redirect: "manual",
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("google-timeout-5s")), 5000)),
    ]);
    tick("google-ok", { status: (r as Response).status });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    tick("google-fail", {
      msg: err.message,
      code: err.cause?.code,
      causeMsg: err.cause?.message,
    });
  }

  // Test B: hit a different known-reliable host
  try {
    tick("cf-start");
    const r = await Promise.race([
      fetch("https://1.1.1.1/cdn-cgi/trace", {
        signal: AbortSignal.timeout(4000),
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("cf-timeout-5s")), 5000)),
    ]);
    tick("cf-ok", { status: (r as Response).status, bodyLen: (await r.text()).length });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    tick("cf-fail", {
      msg: err.message,
      code: err.cause?.code,
      causeMsg: err.cause?.message,
    });
  }

  // Test C: Supabase DNS only
  try {
    const dnsMod = await import("node:dns/promises");
    const host = "bsafbkxvqnlfordqat.supabase.co";
    tick("sb-dns-start", { host });
    const addrs = await Promise.race([
      dnsMod.lookup(host),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("sb-dns-timeout-3s")), 3000)),
    ]);
    tick("sb-dns-ok", addrs);
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    tick("sb-dns-fail", { msg: err.message, code: err.cause?.code });
  }

  return Response.json({ stages, totalMs: Date.now() - t0 }, { status: 200 });
}
