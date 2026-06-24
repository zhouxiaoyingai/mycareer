import { createClient } from "./server";

export interface Session {
  userId: string;
  email: string;
  displayName: string;
  preferredLang: "zh" | "en";
  isAdmin: boolean;
}

/**
 * 必需登录态，否则抛错
 * 用于：API routes 鉴权
 */
export async function requireAuth(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  // 读取 profile 扩展信息
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, preferred_lang, is_admin")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    email: user.email!,
    displayName: profile?.display_name ?? user.email!.split("@")[0],
    preferredLang: (profile?.preferred_lang ?? "zh") as "zh" | "en",
    isAdmin: profile?.is_admin ?? false,
  };
}

/**
 * 可选登录态，未登录返回 null
 * 用于：Server Components 决定渲染登录按钮还是用户菜单
 */
export async function getCurrentUser(): Promise<Session | null> {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}
