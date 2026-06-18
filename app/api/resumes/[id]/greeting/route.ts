import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getResumeById, updateResume } from "@/lib/cloudbase/resumes";
import { getJdById } from "@/lib/cloudbase/jds";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildGreetingMessages,
  parseGreetingResult,
} from "@/lib/ai/prompts/greeting";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();

    const resume = await getResumeById(params.id, session.userId);
    if (!resume) {
      return errorResponse("NOT_FOUND", "简历不存在或无权访问", 404);
    }

    if (resume.type !== "tailored") {
      return validationErrorResponse(
        `仅支持定制版简历重新生成打招呼短文，当前类型: ${resume.type}`,
      );
    }

    if (!resume.matchAnalysis) {
      return validationErrorResponse(
        "该简历缺少匹配度分析，请先生成定制简历",
      );
    }

    if (!resume.jdId) {
      return validationErrorResponse("该简历缺少关联的 JD");
    }

    const jd = await getJdById(resume.jdId, session.userId);
    if (!jd) {
      return errorResponse("NOT_FOUND", "关联的 JD 不存在", 404);
    }

    const resumeZhContent = resume.content?.zh ?? "";

    const messages = buildGreetingMessages({
      jdTitle: jd.targetRole || jd.structured?.title || "目标岗位",
      matchAnalysis: resume.matchAnalysis,
      resumeZhContent,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.7,
      maxTokens: 512,
      responseFormat: "json_object",
    });

    const result = parseGreetingResult(aiResponse.content);

    const nextVersion = (resume.greeting?.version ?? 0) + 1;
    const greeting = {
      text: result.text,
      generatedAt: new Date(),
      version: nextVersion,
    };

    await updateResume(params.id, session.userId, { greeting });

    return successResponse({
      greeting,
      usage: aiResponse.usage,
    });
  } catch (error) {
    console.error("重新生成打招呼短文失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `重新生成打招呼短文失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
