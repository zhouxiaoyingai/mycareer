/**
 * 面试整体评分提示词
 */

import { injectAntiHallucinationRules } from "./shared/anti-hallucination";
import type { InterviewQuestion, SessionAnswer } from "@/types/interview";

export const INTERVIEW_OVERALL_SYSTEM_PROMPT = injectAntiHallucinationRules(
  `你是一个资深面试官。任务是基于候选人所有题目的答题情况，给出整体评分和改进建议。

## 评分原则
- overallScore 为各题分数的加权平均（技术题权重 1.2，行为题 1.0，案例题 1.1，通用题 0.8）
- overallFeedback 必须包含：整体表现评价 + 3 条具体改进建议
- 禁止使用 AI 味词（赋能/打造/夯实等）

## 输出格式（严格 JSON）
\`\`\`json
{
  "overallScore": 78,
  "overallFeedback": "整体表现良好，技术基础扎实，但案例题表达不够结构化。\\n\\n改进建议：\\n1. 案例题使用 STAR 框架组织答案\\n2. 技术题补充量化数据\\n3. 行为题突出个人贡献"
}
\`\`\`

## 注意事项
- 输出必须是合法 JSON
- overallScore 必须是 0-100 的整数
- overallFeedback 必须包含改进建议
- 严禁输出 undefined/null 等 JS 值`,
);

export interface InterviewOverallInput {
  questions: InterviewQuestion[];
  answers: SessionAnswer[];
}

export function buildInterviewOverallUserMessage(input: InterviewOverallInput): string {
  const { questions, answers } = input;
  const answerDetails = questions
    .map((q) => {
      const answer = answers.find((a) => a.questionId === q.id);
      if (!answer) return null;
      return `## 题目 ${q.id}（${q.type}）
- 题目：${q.question}
- 用户答案：${answer.userAnswer}
- 得分：${answer.score}/100
- 反馈：${answer.feedback}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return `请基于以下所有题目的答题情况，给出整体评分和改进建议。

# 答题详情

${answerDetails}

请严格按照系统提示词中的 JSON 格式输出整体评分结果。`;
}

export function buildInterviewOverallMessages(input: InterviewOverallInput) {
  return [
    { role: "system" as const, content: INTERVIEW_OVERALL_SYSTEM_PROMPT },
    { role: "user" as const, content: buildInterviewOverallUserMessage(input) },
  ];
}

export interface InterviewOverallResult {
  overallScore: number;
  overallFeedback: string;
}

export function parseInterviewOverallResult(raw: string): InterviewOverallResult {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const sanitized = cleaned
      .replace(/:\s*undefined\s*([,}])/g, ': ""$1')
      .replace(/:\s*null\s*([,}])/g, ': ""$1');
    const parsed = JSON.parse(sanitized);

    const score = Number(parsed.overallScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`overallScore 必须是 0-100 的整数，当前为 ${String(parsed.overallScore)}`);
    }

    return {
      overallScore: Math.round(score),
      overallFeedback: String(parsed.overallFeedback ?? ""),
    };
  } catch (err) {
    throw new Error(
      `整体评分解析失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
