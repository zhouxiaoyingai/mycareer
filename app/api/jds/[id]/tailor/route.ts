import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { getJdById } from "@/lib/supabase/db/jds";
import { getResumeById, createResume, updateResume } from "@/lib/supabase/db/resumes";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildResumeTailorMessages,
  parseResumeTailorResult,
} from "@/lib/ai/prompts/resume-tailor";
import { detectAiFlavor } from "@/lib/ai/prompts/shared/ai-flavor-check";
import { countPlaceholders } from "@/lib/utils/markdown";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const tailorSchema = z.object({
  standardResumeId: z.string().min(1, "standardResumeId 不可为空"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = tailorSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { standardResumeId } = parsed.data;

    const jd = await getJdById(params.id, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "JD 不存在或无权访问", 404);

    const standard = await getResumeById(standardResumeId, session.userId);
    if (!standard) {
      return errorResponse("NOT_FOUND", "标准版简历不存在或无权访问", 404);
    }
    if (standard.type !== "standard") {
      return validationErrorResponse(
        `仅支持从标准版简历生成定制版，当前简历类型: ${standard.type}`,
      );
    }
    if (!standard.raw_content) {
      return validationErrorResponse("标准版简历尚未生成内容，请先生成标准版");
    }

    const messages = buildResumeTailorMessages({
      standardContent: { zh: standard.raw_content, en: standard.raw_content },
      structured: standard.structured,
      jdText: jd.raw_text,
      targetRole: jd.target_role ?? undefined,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.5,
      maxTokens: 8192,
      responseFormat: "json_object",
    });

    const result = parseResumeTailorResult(aiResponse.content);

    const zhFlavor = detectAiFlavor(result.content.zh);
    const enFlavor = detectAiFlavor(result.content.en);
    const aiFlavorScore = zhFlavor.hits.total + enFlavor.hits.total;
    const zhPlaceholders = countPlaceholders(result.content.zh);
    const enPlaceholders = countPlaceholders(result.content.en);

    const tailoredResume = await createResume({
      userId: session.userId,
      type: "tailored",
      sourceType: standard.source_type,
      sourceFileId: standard.source_file_id ?? undefined,
      rawContent: standard.raw_content,
      structured: standard.structured,
      targetRole: jd.target_role ?? undefined,
      parentId: standardResumeId,
      status: "draft",
    });

    await updateResume(tailoredResume.id, session.userId, {
      raw_content: result.content.zh,
      provenance: result.provenance,
      ai_flavor_score: aiFlavorScore,
      jd_id: params.id,
      match_analysis: result.matchAnalysis,
      confirmable_items: result.confirmableItems,
      confirm_completed: result.confirmableItems.length === 0,
      status: "completed",
      greeting: result.greeting
        ? {
            text: result.greeting.text,
            generatedAt: new Date().toISOString(),
            version: 1,
          }
        : null,
    });

    return successResponse({
      resumeId: tailoredResume.id,
      raw_content: result.content.zh,
      provenance: result.provenance,
      match_analysis: result.matchAnalysis,
      confirmable_items: result.confirmableItems,
      aiFlavorScore,
      aiFlavorPassed: zhFlavor.passed && enFlavor.passed,
      placeholderCount: {
        zh: zhPlaceholders,
        en: enPlaceholders,
        total: zhPlaceholders + enPlaceholders,
      },
      greeting: result.greeting
        ? {
            text: result.greeting.text,
            version: 1,
          }
        : null,
      usage: aiResponse.usage,
    });
  } catch (error) {
    console.error("生成定制简历失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `生成定制简历失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
