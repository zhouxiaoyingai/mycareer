import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import {
  getResumeById,
  updateResume,
  deleteResume,
} from "@/lib/cloudbase/resumes";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  structured: z.object({}).passthrough().optional(),
  content: z
    .object({
      zh: z.string(),
      en: z.string(),
    })
    .optional(),
  provenance: z.array(z.object({}).passthrough()).optional(),
  aiFlavorScore: z.number().optional(),
  status: z.enum(["draft", "confirmed", "archived"]).optional(),
  targetRole: z.string().optional(),
  rawContent: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const resume = await getResumeById(params.id, session.userId);
    if (!resume) {
      return errorResponse("NOT_FOUND", "简历不存在或无权访问", 404);
    }
    return successResponse(resume);
  } catch (error) {
    console.error("获取简历详情失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取简历详情失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    await updateResume(params.id, session.userId, {
      structured: parsed.data.structured as unknown as import("@/types/resume").ResumeStructured | undefined,
      content: parsed.data.content,
      provenance: parsed.data.provenance as unknown as import("@/types/resume").ProvenanceEntry[] | undefined,
      aiFlavorScore: parsed.data.aiFlavorScore,
      status: parsed.data.status,
      targetRole: parsed.data.targetRole,
      rawContent: parsed.data.rawContent,
    });

    const updated = await getResumeById(params.id, session.userId);
    if (!updated) {
      return errorResponse("NOT_FOUND", "简历不存在或无权访问", 404);
    }

    return successResponse(updated);
  } catch (error) {
    console.error("更新简历失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("不存在")) {
      return errorResponse("NOT_FOUND", error.message, 404);
    }
    return internalErrorResponse(
      `更新简历失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    await deleteResume(params.id, session.userId);
    return successResponse({ deleted: true });
  } catch (error) {
    console.error("删除简历失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("不存在")) {
      return errorResponse("NOT_FOUND", error.message, 404);
    }
    return internalErrorResponse(
      `删除简历失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
