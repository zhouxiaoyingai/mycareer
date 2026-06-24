import { createClient } from "@supabase/supabase-js";

/**
 * 管理员 Supabase 客户端
 * ⚠️ 仅服务端使用，绕过 RLS。
 * 绝不能 import 到客户端代码或 Server Components 中。
 * 用于：webhook、迁移脚本、后台任务、AI 后台生成
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
