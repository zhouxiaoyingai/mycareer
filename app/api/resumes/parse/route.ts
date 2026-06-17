import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import { buildResumeParseMessages } from "@/lib/ai/prompts/resume-parse";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from "@/lib/utils/response";
import type { ParsedResumeResult, ProvenanceEntry } from "@/types/resume";

export const dynamic = "force-dynamic";

const parseSchema = z.object({
  rawContent: z.string().min(10, "简历内容过短"),
  sourceType: z.enum(["upload_pdf", "upload_word", "paste", "form", "ai_chat"]),
  hint: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = parseSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { rawContent, sourceType, hint } = parsed.data;

    const messages = buildResumeParseMessages({
      rawContent,
      sourceType,
      hint,
    });

    const response = await callDeepSeekWithRetry(messages, {
      temperature: 0.2,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    const result = parseResumeResult(response.content);

    return successResponse({
      userId: session.userId,
      sourceType,
      rawContent,
      structured: result.structured,
      provenance: result.provenance,
    });
  } catch (error) {
    console.error("简历解析失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `简历解析失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

interface RawParsedResult {
  structured?: ParsedResumeResult["structured"];
  provenance?: ProvenanceEntry[];
}

function parseResumeResult(raw: string): {
  structured: ParsedResumeResult["structured"];
  provenance: ProvenanceEntry[];
} {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as RawParsedResult;

    if (!parsed.structured) {
      throw new Error("AI 返回缺少 structured 字段");
    }

    const s = parsed.structured;
    return {
      structured: {
        contact: s.contact ?? {},
        summary: s.summary,
        experiences: Array.isArray(s.experiences) ? s.experiences : [],
        projects: Array.isArray(s.projects) ? s.projects : [],
        education: Array.isArray(s.education) ? s.education : [],
        skills: s.skills ?? { technical: [], languages: [], tools: [], certifications: [] },
      },
      provenance: Array.isArray(parsed.provenance) ? parsed.provenance : [],
    };
  } catch (err) {
    throw new Error(
      `简历解析结果解析失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
