// lib/supabase/db/profiles.ts
import { createClient } from "../server";
import { createServiceClient } from "../service";

export interface Profile {
  id: string;
  display_name: string;
  preferred_lang: "zh" | "en";
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function ensureProfile(
  userId: string,
  email: string
): Promise<Profile> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: email.split("@")[0],
        preferred_lang: "zh",
        is_admin: false,
      },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error || !data) throw new Error(`ensureProfile failed: ${error?.message}`);
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "display_name" | "preferred_lang">>
): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error || !data) throw new Error(`updateProfile failed: ${error?.message}`);
  return data as Profile;
}
