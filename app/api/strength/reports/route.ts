import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { createStrengthReport, listStrengthReportsByUser } from "@/lib/cloudbase/strength";
import { generateStrengthReport } from "@/lib/ai/prompts/strength-analyze";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const answersSchema = z.object({
  currentStage: z.string().min(1),
  careerClarity: z.string().optional(),
  flowExperiences: z.array(z.string()).min(1),
  achievementType: z.string().min(1),
  achievementStory: z.string().max(500).optional(),
  workEnvironmentPreferences: z.object({
    remoteWork: z.number().min(1).max(5),
    stability: z.number().min(1).max(5),
    fastPaced: z.number().min(1).max(5),
    teamwork: z.number().min(1).max(5),
    independence: z.number().min(1).max(5),
    creativity: z.number().min(1).max(5),
  }),
  valueRanking: z.array(z.string()).min(6).max(6),
  riskTolerance: z.string().min(1),
  learningStyle: z.array(z.string()).max(2).optional(),
  yearsOfExperience: z.number().min(0).max(50),
});

const createSchema = z.object({
  answers: answersSchema,
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { answers } = createSchema.parse(body);

    const report = await createStrengthReport({ userId: session.userId, answers });

    // 触发后台异步生成（不等待完成）
    generateStrengthReport(report._id, session.userId).catch((err) => {
      console.error(`[strength] async generation failed for ${report._id}:`, err);
    });

    return successResponse({ id: report._id, status: report.status }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof z.ZodError) {
      return validationErrorResponse("参数校验失败", { details: error.errors });
    }
    console.error("创建优势报告失败:", error);
    return internalErrorResponse(
      `创建优势报告失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await listStrengthReportsByUser(session.userId, limit, offset);
    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("获取优势报告列表失败:", error);
    return internalErrorResponse(
      `获取优势报告列表失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
