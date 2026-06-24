import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { extractTextFromFile } from "@/lib/utils/file-extract";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import { buildResumeParseMessages } from "@/lib/ai/prompts/resume-parse";
import { createResume } from "@/lib/supabase/db/resumes";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";
import type { ParsedResumeResult, ProvenanceEntry } from "@/types/resume";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return validationErrorResponse("未提供文件", { field: "file" });
    }

    if (file.size > MAX_FILE_SIZE) {
      return validationErrorResponse("文件大小超过 10MB 限制", {
        size: file.size,
        maxSize: MAX_FILE_SIZE,
      });
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return validationErrorResponse(
        `不支持的文件类型: ${file.type}`,
        { mimeType: file.type },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractResult = await extractTextFromFile({
      fileName: file.name,
      mimeType: file.type,
      buffer,
    });

    const messages = buildResumeParseMessages({
      rawContent: extractResult.text,
      sourceType: extractResult.sourceType,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.2,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    const parsed = parseResumeResult(aiResponse.content);

    // 创建 master 简历记录
    const resume = await createResume({
      userId: session.userId,
      type: "master",
      sourceType: extractResult.sourceType,
      rawContent: extractResult.text,
      structured: parsed.structured,
      status: "draft",
    });

    return successResponse({
      resumeId: resume.id,
      fileName: extractResult.fileName,
      sourceType: extractResult.sourceType,
      rawContent: extractResult.text,
      structured: parsed.structured,
      provenance: parsed.provenance,
    });
  } catch (error) {
    console.error("简历上传解析失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("不支持的文件类型")) {
      return validationErrorResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("文本提取失败")) {
      return errorResponse("FILE_UPLOAD_ERROR", error.message, 422);
    }
    return internalErrorResponse(
      `简历上传解析失败: ${error instanceof Error ? error.message : String(error)}`,
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
