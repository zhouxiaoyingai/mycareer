import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById } from "@/lib/cloudbase/interviews";
import { getSessionById } from "@/lib/cloudbase/interview-sessions";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(
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

    return successResponse({ interview, session: sessionData });
  } catch (error) {
    console.error("获取会话详情失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取会话详情失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
