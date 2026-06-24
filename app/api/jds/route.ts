import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { listJdsByUser, createJd } from "@/lib/supabase/db/jds";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";
import type { JdStatus } from "@/types/jd";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  rawText: z.string().min(1, "JD 原文不可为空").max(20000, "JD 原文过长"),
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
  }),
  targetRole: z.string().optional(),
  status: z.enum(["draft", "parsed", "archived"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as JdStatus | null;
    const limitParam = searchParams.get("limit");

    const validStatuses: JdStatus[] = ["draft", "parsed", "archived"];
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

    const jds = await listJdsByUser(session.userId, {
      limit,
    });
    return successResponse({ jds });
  } catch (error) {
    console.error("获取 JD 列表失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取 JD 列表失败: ${error instanceof Error ? error.message : String(error)}`,
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
    const jd = await createJd({
      userId: session.userId,
      rawText: data.rawText,
      structured: data.structured,
      targetRole: data.targetRole,
      status: data.status,
    });
    return successResponse(jd, 201);
  } catch (error) {
    console.error("创建 JD 失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `创建 JD 失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
