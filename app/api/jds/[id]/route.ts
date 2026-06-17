import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getJdById, updateJd, deleteJd } from "@/lib/cloudbase/jds";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  validationErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  rawText: z.string().min(1).max(20000).optional(),
  structured: z.object({
    title: z.string(),
    company: z.string().optional(),
    location: z.string().optional(),
    employmentType: z.string(),
    experienceLevel: z.string(),
    hardSkills: z.array(z.object({
      name: z.string(),
      weight: z.number(),
      context: z.string(),
    })).default([]),
    softSkills: z.array(z.object({
      name: z.string(),
      weight: z.number(),
      context: z.string(),
    })).default([]),
    industryTerms: z.array(z.object({
      name: z.string(),
      weight: z.number(),
      context: z.string(),
    })).default([]),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    niceToHave: z.array(z.string()).default([]),
  }).optional(),
  targetRole: z.string().optional(),
  status: z.enum(["draft", "parsed", "archived"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const jd = await getJdById(params.id, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "JD 不存在或无权访问", 404);
    return successResponse(jd);
  } catch (error) {
    console.error("获取 JD 详情失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取 JD 详情失败: ${error instanceof Error ? error.message : String(error)}`,
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

    await updateJd(params.id, session.userId, parsed.data);
    const updated = await getJdById(params.id, session.userId);
    return successResponse(updated);
  } catch (error) {
    console.error("更新 JD 失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("不存在")) {
      return errorResponse("NOT_FOUND", error.message, 404);
    }
    return internalErrorResponse(
      `更新 JD 失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    await deleteJd(params.id, session.userId);
    return successResponse({ deleted: true });
  } catch (error) {
    console.error("删除 JD 失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("不存在")) {
      return errorResponse("NOT_FOUND", error.message, 404);
    }
    return internalErrorResponse(
      `删除 JD 失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
