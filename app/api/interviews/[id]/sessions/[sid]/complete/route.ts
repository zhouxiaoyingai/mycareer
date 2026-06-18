import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById } from "@/lib/cloudbase/interviews";
import { getSessionById, updateSession } from "@/lib/cloudbase/interview-sessions";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewOverallMessages,
  parseInterviewOverallResult,
} from "@/lib/ai/prompts/interview-overall";
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
  { params }: { params: { id: string; sid: string } },
) {
  try {
    const session = await requireAuth();

    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const sessionData = await getSessionById(params.sid, session.userId);
    if (!sessionData) return errorResponse("NOT_FOUND", "答题会话不存在或无权访问", 404);
    if (sessionData.interviewId !== params.id) {
      return errorResponse("NOT_FOUND", "会话不属于该题集", 404);
    }
    if (sessionData.status === "completed") {
      return validationErrorResponse("该会话已完成");
    }
    if (sessionData.answers.length === 0) {
      return validationErrorResponse("至少答完 1 题才能完成会话");
    }

    const messages = buildInterviewOverallMessages({
      questions: interview.questions,
      answers: sessionData.answers,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.5,
      maxTokens: 1024,
      responseFormat: "json_object",
    });

    const result = parseInterviewOverallResult(aiResponse.content);

    await updateSession(params.sid, session.userId, {
      overallScore: result.overallScore,
      overallFeedback: result.overallFeedback,
      status: "completed",
    });

    return successResponse({
      overallScore: result.overallScore,
      overallFeedback: result.overallFeedback,
      usage: aiResponse.usage,
    });
  } catch (error) {
    console.error("完成会话失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `完成会话失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
