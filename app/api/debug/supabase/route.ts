import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing)";
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const result: Record<string, unknown> = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      has_anon_key: hasKey,
      has_service_role: hasService,
      node_env: process.env.NODE_ENV,
      vercel_region: process.env.VERCEL_REGION ?? "(not on vercel)",
    },
  };

  // Test 1: anonymous health endpoint
  try {
    const r = await fetch(`${url}/auth/v1/health`, {
      signal: AbortSignal.timeout(8000),
    });
    result.health = { ok: true, status: r.status, body: await r.text() };
  } catch (e) {
    result.health = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      cause: e instanceof Error && "cause" in e ? String((e as Error & { cause?: unknown }).cause) : undefined,
    };
  }

  // Test 2: Supabase client signup (closest to register flow)
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: `diag_${Date.now()}@example.com`,
      password: "Test1234!",
    });
    result.signup = error
      ? { ok: false, error: error.message, status: error.status }
      : { ok: true, user_id: data.user?.id, email: data.user?.email };
  } catch (e) {
    result.signup = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      cause: e instanceof Error && "cause" in e ? String((e as Error & { cause?: unknown }).cause) : undefined,
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5).join("\n") : undefined,
    };
  }

  return Response.json(result, { status: 200 });
}
