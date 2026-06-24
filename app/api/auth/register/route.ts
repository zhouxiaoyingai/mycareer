import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/db/profiles";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/utils/response";

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
  displayName: z.string().min(1, "昵称不可为空").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { email, password, displayName } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName ?? "" } },
    });
    if (error || !data.user) {
      const msg = error?.message ?? "注册失败";
      if (msg.toLowerCase().includes("already registered")) {
        return errorResponse("CONFLICT", "该邮箱已注册", 409);
      }
      return errorResponse("VALIDATION_ERROR", "注册失败: " + msg, 400);
    }

    // 创建 profile 记录(service role 绕过 RLS)
    try {
      await ensureProfile(data.user.id, email);
    } catch (err) {
      console.error("[register] ensureProfile failed:", err);
      // profile 创建失败不影响注册成功(用户已通过 signUp)
    }

    return successResponse(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      201
    );
  } catch (error) {
    console.error("注册失败:", error);
    return internalErrorResponse(
      error instanceof Error ? error.message : "注册失败，请稍后重试"
    );
  }
}
