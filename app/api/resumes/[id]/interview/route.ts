import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getResumeById } from "@/lib/cloudbase/resumes";
import { getJdById } from "@/lib/cloudbase/jds";
import { createInterview } from "@/lib/cloudbase/interviews";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewGenerateMessages,
  parseInterviewGenerateResult,
} from "@/lib/ai/prompts/interview-generate";
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
    if (!resume) return errorResponse("NOT_FOUND", "简历不存在或无权访问", 404);

    if (resume.type !== "tailored") {
      return validationErrorResponse("仅支持定制版简历生成面试题");
    }
    if (!resume.jdId) return validationErrorResponse("该简历缺少关联的 JD");
    if (!resume.content?.zh) return validationErrorResponse("简历缺少中文版内容");

    const jd = await getJdById(resume.jdId, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "关联的 JD 不存在", 404);

    const resumeSnapshot = {
      resumeId: resume._id,
      targetRole: resume.targetRole,
      contentZh: resume.content.zh,
    };
    const jdSnapshot = {
      jdId: jd._id,
      title: jd.structured.title,
      company: jd.structured.company,
      hardSkills: jd.structured.hardSkills.map((s) => ({ name: s.name, weight: s.weight })),
    };

    const messages = buildInterviewGenerateMessages({
      jdStructured: jd.structured,
      resumeZhContent: resume.content.zh,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    const result = parseInterviewGenerateResult(aiResponse.content);

    const interview = await createInterview({
      userId: session.userId,
      resumeId: resume._id,
      jdId: jd._id,
      resumeSnapshot,
      jdSnapshot,
      questionTypes: ["technical", "behavioral", "case", "general"],
      questions: result.questions,
    });

    return successResponse({ interview, usage: aiResponse.usage }, 201);
  } catch (error) {
    console.error("定制简历触发生成面试题失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `生成面试题失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
