import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/utils/validation";
import { registerUser, loginUser, setSession } from "@/lib/cloudbase/auth";
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { email, password, displayName } = parsed.data;

    try {
      await registerUser(email, password, displayName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "注册失败";
      if (msg.includes("已注册")) {
        return errorResponse("CONFLICT", msg, 409);
      }
      throw err;
    }

    const { token } = await loginUser(email, password);
    await setSession(token);

    return successResponse({ success: true }, 201);
  } catch (error) {
    console.error("注册失败:", error);
    return internalErrorResponse(
      error instanceof Error ? error.message : "注册失败，请稍后重试"
    );
  }
}
