// lib/supabase/db/jds.ts
import { createClient } from "../server";

export interface Jd {
  id: string;
  user_id: string;
  raw_text: string;
  structured: Record<string, unknown>;
  target_role: string | null;
  status: "draft" | "parsed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface CreateJdInput {
  userId: string;
  rawText: string;
  structured: Record<string, unknown>;
  targetRole?: string;
  status?: Jd["status"];
}

export async function listJdsByUser(
  userId: string,
  opts?: { limit?: number }
): Promise<Jd[]> {
  const supabase = await createClient();
  let query = supabase
    .from("jds")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listJdsByUser failed: ${error.message}`);
  return (data ?? []) as Jd[];
}

export async function getJdById(
  userId: string,
  id: string
): Promise<Jd | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jds")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Jd;
}

export async function createJd(input: CreateJdInput): Promise<Jd> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jds")
    .insert({
      user_id: input.userId,
      raw_text: input.rawText,
      structured: input.structured,
      target_role: input.targetRole ?? null,
      status: input.status ?? "draft",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createJd failed: ${error?.message}`);
  return data as Jd;
}

export async function updateJd(
  userId: string,
  id: string,
  patch: Partial<Omit<Jd, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Jd> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jds")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateJd failed: ${error?.message}`);
  return data as Jd;
}

export async function deleteJd(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("jds")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteJd failed: ${error.message}`);
}
