import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getStrengthReportById, deleteStrengthReport } from "@/lib/supabase/db/strength";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const report = await getStrengthReportById(params.id, session.userId);

    if (!report) {
      return notFoundResponse("报告不存在");
    }

    return successResponse(report);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("获取优势报告详情失败:", error);
    return internalErrorResponse(
      `获取优势报告详情失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const report = await getStrengthReportById(params.id, session.userId);

    if (!report) {
      return notFoundResponse("报告不存在");
    }

    await deleteStrengthReport(params.id, session.userId);
    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("删除优势报告失败:", error);
    return internalErrorResponse(
      `删除优势报告失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
