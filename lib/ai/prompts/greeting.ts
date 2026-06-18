/**
 * 打招呼短文提示词（用于重新生成场景）
 * 基于已有 matchAnalysis 重新生成 50-100 字中文打招呼短文
 */

import { injectAntiHallucinationRules } from "./shared/anti-hallucination";
import type { MatchAnalysis } from "@/types/jd";

export const GREETING_SYSTEM_PROMPT = injectAntiHallucinationRules(
  `你是一个专业的求职打招呼话术生成助手。任务是基于 JD 和简历匹配分析，生成一段 50-100 字的中文打招呼短文，用于私信招聘方。

## 生成要求
1. 突出用户核心优势（2-3个，来自简历内容）
2. 突出与 JD 的匹配点（2-3个，来自 matchAnalysis.matchDetails 中 status 为 matched 的项）
3. 字数严格 50-100 字
4. 语气自然、专业、引起兴趣，避免过度自夸
5. 禁止使用 AI 味词（赋能/打造/夯实/抓手/闭环/心智/颗粒度等）
6. 不可编造简历中不存在的能力

## 输出格式（严格 JSON）
\`\`\`json
{
  "text": "您好，我是有5年前端经验的工程师，熟悉 React 和 TypeScript，曾主导多个大型项目。注意到贵司岗位要求 React 经验，与我的背景高度匹配，期待进一步沟通。"
}
\`\`\``,
);

export interface GreetingInput {
  jdTitle: string;
  matchAnalysis: MatchAnalysis;
  resumeZhContent: string;
}

export function buildGreetingUserMessage(input: GreetingInput): string {
  const { jdTitle, matchAnalysis, resumeZhContent } = input;
  const matchedSkills = matchAnalysis.matchDetails
    .filter((d) => d.status === "matched")
    .map((d) => `${d.skill}（${d.evidence}）`)
    .join("、");
  const missingSkills = matchAnalysis.matchDetails
    .filter((d) => d.status === "missing")
    .map((d) => d.skill)
    .join("、");

  return `请基于以下信息生成一段 50-100 字的中文打招呼短文。

# 目标岗位
${jdTitle}

# 匹配度分析
- 总分：${matchAnalysis.matchScore}/100
- 已匹配技能：${matchedSkills || "无"}
- 缺失技能：${missingSkills || "无"}
- 差距分析：${matchAnalysis.gapAnalysis}

# 用户简历（中文版）
${resumeZhContent}

请严格按照系统提示词中的 JSON 格式输出。`;
}

export function buildGreetingMessages(input: GreetingInput) {
  return [
    { role: "system" as const, content: GREETING_SYSTEM_PROMPT },
    { role: "user" as const, content: buildGreetingUserMessage(input) },
  ];
}

export interface GreetingResult {
  text: string;
}

export function parseGreetingResult(raw: string): GreetingResult {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.text !== "string" || !parsed.text) {
      throw new Error("text 字段缺失或为空");
    }
    return { text: parsed.text };
  } catch (err) {
    throw new Error(
      `打招呼短文解析失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
