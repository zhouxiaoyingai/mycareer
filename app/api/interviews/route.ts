import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { createInterview, listInterviewsByUser } from "@/lib/supabase/db/interviews";
import { getSessionStatsByInterviewIds } from "@/lib/supabase/db/interview-sessions";
import { getJdById } from "@/lib/supabase/db/jds";
import { getResumeById } from "@/lib/supabase/db/resumes";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewGenerateMessages,
  parseInterviewGenerateResult,
} from "@/lib/ai/prompts/interview-generate";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  validationErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const jdId = searchParams.get("jdId") ?? undefined;
    const limitParam = searchParams.get("limit");

    let limit: number | undefined;
    if (limitParam) {
      const parsed = Number.parseInt(limitParam, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
        return validationErrorResponse("limit 参数应为 1-100 之间的整数");
      }
      limit = parsed;
    }

    const interviews = await listInterviewsByUser(session.userId, { jdId, limit });
    const interviewIds = interviews.map((i) => i.id);
    const statsMap = await getSessionStatsByInterviewIds(interviewIds, session.userId);
    const interviewsWithStats = interviews.map((i) => {
      const stats = statsMap.get(i.id);
      return {
        ...i,
        sessionCount: stats?.sessionCount ?? 0,
        bestScore: stats?.bestScore,
      };
    });

    return successResponse({ interviews: interviewsWithStats });
  } catch (error) {
    console.error("获取面试题集列表失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取面试题集列表失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const createSchema = z.object({
  jdId: z.string().min(1, "jdId 不可为空"),
  resumeId: z.string().min(1, "resumeId 不可为空"),
  questionTypes: z
    .array(z.enum(["technical", "behavioral", "case", "general"]))
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { jdId, resumeId } = parsed.data;

    const jd = await getJdById(jdId, session.userId);
    if (!jd) return validationErrorResponse("JD 不存在或无权访问");

    const resume = await getResumeById(resumeId, session.userId);
    if (!resume) return validationErrorResponse("简历不存在或无权访问");
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
      resumeId: resume.id,
      jdId: jd.id,
      resumeSnapshot,
      jdSnapshot,
      questionTypes: parsed.data.questionTypes ?? ["technical", "behavioral", "case", "general"],
      questions: result.questions,
    });

    return successResponse({ interview, usage: aiResponse.usage }, 201);
  } catch (error) {
    console.error("生成面试题失败:", error);
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
