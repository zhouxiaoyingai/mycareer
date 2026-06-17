import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { listResumesByUser, createResume } from "@/lib/cloudbase/resumes";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";
import type { ResumeType, ResumeStatus } from "@/types/resume";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  type: z.enum(["master", "standard", "tailored"]),
  sourceType: z.enum(["upload_pdf", "upload_word", "paste", "form", "ai_chat"]),
  rawContent: z.string().min(1, "原始内容不可为空"),
  structured: z.object({
    contact: z.object({}).passthrough().optional(),
    summary: z.string().optional(),
    experiences: z.array(z.object({}).passthrough()).default([]),
    projects: z.array(z.object({}).passthrough()).default([]),
    education: z.array(z.object({}).passthrough()).default([]),
    skills: z.object({}).passthrough().optional(),
  }),
  sourceFileId: z.string().optional(),
  targetRole: z.string().optional(),
  parentId: z.string().optional(),
  status: z.enum(["draft", "parsed", "generating", "completed", "failed", "confirmed", "archived"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ResumeType | null;
    const status = searchParams.get("status") as ResumeStatus | null;
    const limitParam = searchParams.get("limit");

    const validTypes: ResumeType[] = ["master", "standard", "tailored"];
    const validStatuses: ResumeStatus[] = ["draft", "parsed", "generating", "completed", "failed", "confirmed", "archived"];

    if (type && !validTypes.includes(type)) {
      return validationErrorResponse(`无效的 type 参数: ${type}`);
    }
    if (status && !validStatuses.includes(status)) {
      return validationErrorResponse(`无效的 status 参数: ${status}`);
    }

    let limit: number | undefined;
    if (limitParam) {
      const parsed = Number.parseInt(limitParam, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
        return validationErrorResponse("limit 参数应为 1-100 之间的整数");
      }
      limit = parsed;
    }

    const resumes = await listResumesByUser(session.userId, {
      type: type ?? undefined,
      status: status ?? undefined,
      limit,
    });

    return successResponse({ resumes });
  } catch (error) {
    console.error("获取简历列表失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取简历列表失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const data = parsed.data;
    const resume = await createResume({
      userId: session.userId,
      type: data.type,
      sourceType: data.sourceType,
      rawContent: data.rawContent,
      structured: data.structured as unknown as import("@/types/resume").ResumeStructured,
      sourceFileId: data.sourceFileId,
      targetRole: data.targetRole,
      parentId: data.parentId,
      status: data.status,
    });

    return successResponse(resume, 201);
  } catch (error) {
    console.error("创建简历失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `创建简历失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
