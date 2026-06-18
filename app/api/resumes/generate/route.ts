import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getResumeById, createResume, updateResume } from "@/lib/cloudbase/resumes";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildResumeGenerateMessages,
  parseResumeGenerateResult,
} from "@/lib/ai/prompts/resume-generate";
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

const generateSchema = z.object({
  masterResumeId: z.string().min(1, "masterResumeId 不可为空"),
  templateStyle: z.enum(["star", "project", "skill", "mixed"]),
  length: z.enum(["1page", "2page", "auto"]),
  language: z.enum(["zh", "en", "both"]),
  targetRole: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { masterResumeId, templateStyle, length, language, targetRole } = parsed.data;

    const master = await getResumeById(masterResumeId, session.userId);
    if (!master) {
      return errorResponse("NOT_FOUND", "master 简历不存在或无权访问", 404);
    }

    if (master.type !== "master") {
      return validationErrorResponse(
        `仅支持从 master 简历生成标准版，当前简历类型: ${master.type}`,
      );
    }

    const messages = buildResumeGenerateMessages({
      structured: master.structured,
      options: { templateStyle, length, language },
      targetRole,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.7,
      maxTokens: 8192,
      responseFormat: "json_object",
    });

    const result = parseResumeGenerateResult(aiResponse.content);

    // AI 味检测
    const zhFlavor = detectAiFlavor(result.content.zh);
    const enFlavor = detectAiFlavor(result.content.en);
    const totalHits = zhFlavor.hits.total + enFlavor.hits.total;
    const aiFlavorScore = totalHits;

    // 占位符统计
    const zhPlaceholders = countPlaceholders(result.content.zh);
    const enPlaceholders = countPlaceholders(result.content.en);

    // 创建 standard 简历记录
    const standardResume = await createResume({
      userId: session.userId,
      type: "standard",
      sourceType: master.sourceType,
      sourceFileId: master.sourceFileId,
      rawContent: master.rawContent,
      structured: master.structured,
      targetRole,
      parentId: masterResumeId,
      status: "draft",
    });

    // 更新 standard 简历的 content/provenance/aiFlavorScore，状态置为 completed
    await updateResume(standardResume._id, session.userId, {
      content: result.content,
      provenance: result.provenance,
      aiFlavorScore,
      status: "completed",
    });

    return successResponse({
      resumeId: standardResume._id,
      content: result.content,
      provenance: result.provenance,
      aiFlavorScore,
      aiFlavorPassed: zhFlavor.passed && enFlavor.passed,
      placeholderCount: {
        zh: zhPlaceholders,
        en: enPlaceholders,
        total: zhPlaceholders + enPlaceholders,
      },
      usage: aiResponse.usage,
    });
  } catch (error) {
    console.error("生成标准版简历失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `生成标准版简历失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
