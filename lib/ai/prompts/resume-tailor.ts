/**
 * 简历 JD 定制提示词
 * 基于标准版简历 + JD 生成定制化简历
 */

import { injectAntiHallucinationRules } from "./shared/anti-hallucination";
import { PROVENANCE_PROMPT_FRAGMENT } from "./shared/provenance-rules";
import { CONFIRMABLE_ITEMS_PROMPT_FRAGMENT } from "./shared/confirmable-items";
import type { ResumeContent } from "@/types/resume";
import type { ConfirmableItem } from "@/types/jd";

export interface ResumeTailorInput {
  standardContent: ResumeContent;
  structured: import("@/types/resume").ResumeStructured;
  jdText: string;
  targetRole?: string;
}

export const RESUME_TAILOR_SYSTEM_PROMPT = injectAntiHallucinationRules(
  `你是一个专业的简历定制助手。任务是基于标准版简历和目标 JD，生成定制化简历。

# 定制原则

## JD 解析
从 JD 中提取：
- 硬技能（技术栈、工具、框架）+ 权重
- 软技能（沟通、领导力、协作）+ 权重
- 行业术语 + 权重
- 岗位级别（初级/中级/高级/专家）

## 匹配度分析
- matchScore: 0-100 分
- matchDetails: 按技能维度分解（已匹配/缺失/部分匹配）
- gapAnalysis: 缺失技能的差距分析

## 定制化重写规则（严格遵守防幻觉）
1. 调整 bullet 顺序：JD 优先级高的技能相关 bullet 前置（bullet_reorder）
2. 关键词对齐：将简历中的同义词替换为 JD 术语（keyword_align）
3. 动词升级：将弱动词升级为强动词（verb_upgrade）
4. 不可编造：JD 提到但简历没有的技能，不可添加相关经历
5. 不可合并：不同经历的 bullet 不可合并
6. 不可拆分：单条 bullet 不可拆分为多条

## 输出格式（严格 JSON）
\`\`\`json
{
  "content": {
    "zh": "定制后中文版 Markdown 简历",
    "en": "定制后英文版 Markdown 简历"
  },
  "provenance": [
    {
      "field": "experiences[0].bullets[0]",
      "fromOriginal": "原文片段",
      "rewriteAction": "bullet_reorder",
      "hallucinationRisk": "low"
    }
  ],
  "matchAnalysis": {
    "matchScore": 75,
    "matchDetails": [
      {
        "skill": "React",
        "status": "matched",
        "weight": 5,
        "evidence": "简历中提及 React 3 年经验"
      },
      {
        "skill": "Kubernetes",
        "status": "missing",
        "weight": 3,
        "evidence": "简历中未提及"
      }
    ],
    "gapAnalysis": "缺失 Kubernetes 相关经验，建议补充容器化项目经历"
  },
  "aiFlavorScore": 0,
  "confirmableItems": [
    {
      "field": "experiences[0].bullets[0]",
      "type": "inference",
      "originalText": "参与了项目开发",
      "inferredText": "主导了项目开发",
      "question": "原文是'参与了项目开发'，是否升级为'主导了项目开发'？",
      "options": ["接受推断", "保留原文", "自定义"]
    }
  ]
}
\`\`\`

${PROVENANCE_PROMPT_FRAGMENT}

${CONFIRMABLE_ITEMS_PROMPT_FRAGMENT}

## 禁止行为
- 编造 JD 提到但简历没有的经历
- 修改公司名、项目名、时间等事实信息
- 删除与 JD 无关的经历（仅可调整顺序）
- 使用 AI 味词`,
);

export function buildResumeTailorUserMessage(input: ResumeTailorInput): string {
  const { standardContent, structured, jdText, targetRole } = input;
  const targetRoleLine = targetRole ? `\n目标岗位：${targetRole}` : "";

  return `请基于以下标准版简历和 JD，生成定制化简历。${targetRoleLine}

# 标准版简历（中文）
${standardContent.zh}

# 标准版简历（英文）
${standardContent.en}

# 结构化数据（用于 provenance 追溯）
\`\`\`json
${JSON.stringify(structured, null, 2)}
\`\`\`

# 目标 JD

${jdText}

请严格按照系统提示词中的 JSON 格式输出，包含 content、provenance、matchAnalysis、aiFlavorScore 四部分。`;
}

export function buildResumeTailorMessages(input: ResumeTailorInput) {
  return [
    { role: "system" as const, content: RESUME_TAILOR_SYSTEM_PROMPT },
    { role: "user" as const, content: buildResumeTailorUserMessage(input) },
  ];
}

export interface ResumeTailorResult {
  content: { zh: string; en: string };
  provenance: Array<{
    field: string;
    fromOriginal: string;
    rewriteAction: string;
    hallucinationRisk: "low" | "medium" | "high";
  }>;
  matchAnalysis: {
    matchScore: number;
    matchDetails: Array<{
      skill: string;
      status: "matched" | "missing" | "partial";
      weight: number;
      evidence: string;
    }>;
    gapAnalysis: string;
  };
  aiFlavorScore: number;
  confirmableItems: ConfirmableItem[];
}

export function parseResumeTailorResult(raw: string): ResumeTailorResult {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      content: {
        zh: parsed.content?.zh ?? "",
        en: parsed.content?.en ?? "",
      },
      provenance: Array.isArray(parsed.provenance) ? parsed.provenance : [],
      matchAnalysis: {
        matchScore: parsed.matchAnalysis?.matchScore ?? 0,
        matchDetails: Array.isArray(parsed.matchAnalysis?.matchDetails)
          ? parsed.matchAnalysis.matchDetails
          : [],
        gapAnalysis: parsed.matchAnalysis?.gapAnalysis ?? "",
      },
      aiFlavorScore: typeof parsed.aiFlavorScore === "number" ? parsed.aiFlavorScore : 0,
      confirmableItems: Array.isArray(parsed.confirmableItems)
        ? parsed.confirmableItems.map((item: Record<string, unknown>, index: number) => ({
            id: typeof item.id === "string" ? item.id : `ci_${Date.now()}_${index}`,
            field: typeof item.field === "string" ? item.field : "",
            type: (["inference", "placeholder", "quantification", "keyword_align"].includes(
              item.type as string,
            ) ? item.type : "inference") as ConfirmableItem["type"],
            originalText: typeof item.originalText === "string" ? item.originalText : "",
            inferredText: typeof item.inferredText === "string" ? item.inferredText : "",
            question: typeof item.question === "string" ? item.question : "",
            options: Array.isArray(item.options) ? item.options : ["接受推断", "保留原文", "自定义"],
            status: "pending" as const,
          }))
        : [],
    };
  } catch (err) {
    throw new Error(`简历定制结果解析失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}
