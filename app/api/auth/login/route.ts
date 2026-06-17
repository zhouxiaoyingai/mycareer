import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/utils/validation";
import { loginUser, setSession } from "@/lib/cloudbase/auth";
import { successResponse, validationErrorResponse, unauthorizedResponse } from "@/lib/utils/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const { user, token } = await loginUser(email, password);
    await setSession(token);

    return successResponse({
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        preferredLang: user.preferredLang,
      },
    });
  } catch (error) {
    console.error("登录失败:", error);
    return unauthorizedResponse("邮箱或密码错误");
  }
}
