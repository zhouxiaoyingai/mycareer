import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById, deleteInterview } from "@/lib/cloudbase/interviews";
import { listSessionsByInterview } from "@/lib/cloudbase/interview-sessions";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const sessions = await listSessionsByInterview(params.id, session.userId);
    const sessionsWithTotal = sessions.map((s) => ({
      ...s,
      totalQuestions: interview.questions.length,
    }));

    return successResponse({ interview, sessions: sessionsWithTotal });
  } catch (error) {
    console.error("获取面试题集详情失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取面试题集详情失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    await deleteInterview(params.id, session.userId);
    return successResponse({ deleted: true });
  } catch (error) {
    console.error("删除面试题集失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("不存在")) {
      return errorResponse("NOT_FOUND", error.message, 404);
    }
    return internalErrorResponse(
      `删除面试题集失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
