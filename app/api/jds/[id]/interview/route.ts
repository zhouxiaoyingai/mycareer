import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getJdById } from "@/lib/supabase/db/jds";
import { getResumeById, listResumesByUser } from "@/lib/supabase/db/resumes";
import { createInterview } from "@/lib/supabase/db/interviews";
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
import type { Resume } from "@/types/resume";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();

    const jd = await getJdById(params.id, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "JD 不存在或无权访问", 404);

    // 优先查找该 JD 关联的定制简历
    const tailoredResumes = await listResumesByUser(session.userId, { type: "tailored" });
    let resume: Resume | null = null;
    let resumeId: string | undefined;

    for (const r of tailoredResumes) {
      const fullResume = await getResumeById(r.id, session.userId);
      if (fullResume?.jd_id === jd.id) {
        resume = fullResume;
        resumeId = r.id;
        break;
      }
    }

    // 若无定制简历，使用标准版
    if (!resume) {
      const standardResumes = await listResumesByUser(session.userId, {
        type: "standard",
        status: "completed",
      });
      if (standardResumes.length === 0) {
        return validationErrorResponse("请先创建标准版简历");
      }
      resume = await getResumeById(standardResumes[0].id, session.userId);
      resumeId = standardResumes[0].id;
    }

    if (!resume || !resumeId) return validationErrorResponse("简历不存在或无权访问");
    if (!resume.raw_content) return validationErrorResponse("简历缺少中文版内容");

    const resumeSnapshot = {
      resumeId: resume.id,
      targetRole: resume.target_role ?? undefined,
      contentZh: resume.raw_content,
    };
    const jdSnapshot = {
      jdId: jd.id,
      title: jd.structured.title,
      company: jd.structured.company,
      hardSkills: jd.structured.hardSkills.map((s) => ({ name: s.name, weight: s.weight })),
    };

    const messages = buildInterviewGenerateMessages({
      jdStructured: jd.structured,
      resumeZhContent: resume.raw_content,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    const result = parseInterviewGenerateResult(aiResponse.content);

    const interview = await createInterview({
      userId: session.userId,
      resumeId,
      jdId: jd.id,
      resumeSnapshot,
      jdSnapshot,
      questionTypes: ["technical", "behavioral", "case", "general"],
      questions: result.questions,
    });

    return successResponse({ interview, usage: aiResponse.usage }, 201);
  } catch (error) {
    console.error("JD 触发生成面试题失败:", error);
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
