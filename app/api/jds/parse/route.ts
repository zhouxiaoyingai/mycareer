import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import { buildJdParseMessages, parseJdParseResult } from "@/lib/ai/prompts/jd-parse";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  validationErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const parseSchema = z.object({
  jdText: z.string().min(10, "JD 文本过短（至少 10 字符）").max(20000, "JD 文本过长"),
  targetRole: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = parseSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { jdText, targetRole } = parsed.data;
    const messages = buildJdParseMessages({ jdText, targetRole });
    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.3,
      maxTokens: 4096,
      responseFormat: "json_object",
    });
    const structured = parseJdParseResult(aiResponse.content);
    return successResponse({ structured, usage: aiResponse.usage });
  } catch (error) {
    console.error("JD 解析失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `JD 解析失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
