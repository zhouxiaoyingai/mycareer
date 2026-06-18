import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById } from "@/lib/cloudbase/interviews";
import { getSessionById, updateSession } from "@/lib/cloudbase/interview-sessions";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewScoreMessages,
  parseInterviewScoreResult,
} from "@/lib/ai/prompts/interview-score";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  questionId: z.string().min(1, "questionId 不可为空"),
  userAnswer: z.string().min(1, "userAnswer 不可为空"),
});

export async function POST(
  request: NextRequest,
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
      return validationErrorResponse("该会话已完成，不可再提交答案");
    }

    const body = await request.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { questionId, userAnswer } = parsed.data;
    const question = interview.questions.find((q) => q.id === questionId);
    if (!question) return validationErrorResponse(`题目 ${questionId} 不存在`);

    const existingAnswer = sessionData.answers.find((a) => a.questionId === questionId);
    if (existingAnswer) return validationErrorResponse(`题目 ${questionId} 已答过`);

    const messages = buildInterviewScoreMessages({
      question,
      userAnswer,
      resumeZhContent: interview.resumeSnapshot.contentZh,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.3,
      maxTokens: 1024,
      responseFormat: "json_object",
    });

    const result = parseInterviewScoreResult(aiResponse.content);

    const newAnswer = {
      questionId,
      userAnswer,
      score: result.score,
      feedback: result.feedback,
      comparison: result.comparison,
      scoredAt: new Date(),
    };

    const updatedAnswers = [...sessionData.answers, newAnswer];
    await updateSession(params.sid, session.userId, { answers: updatedAnswers });

    return successResponse({ answer: newAnswer, usage: aiResponse.usage });
  } catch (error) {
    console.error("提交答案失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `提交答案失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
