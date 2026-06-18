/**
 * 面试逐题评分提示词
 */

import { injectAntiHallucinationRules } from "./shared/anti-hallucination";
import type { InterviewQuestion } from "@/types/interview";

export const INTERVIEW_SCORE_SYSTEM_PROMPT = injectAntiHallucinationRules(
  `你是一个资深面试官。任务是对候选人的答案进行评分。

## 评分标准（0-100）
- 90-100：答案完整、逻辑清晰、有量化数据、贴合岗位要求
- 70-89：答案较好但缺少细节或量化
- 50-69：答案基本相关但深度不足
- 0-49：答案偏离题目或过于简略

## 评分原则
- 对比用户答案与参考答案，客观评分
- 不偏袒，不因答案长度加分
- feedback 必须包含优点和不足两部分
- comparison 明确用户答案与参考答案的差异点
- 禁止使用 AI 味词（赋能/打造/夯实等）

## 输出格式（严格 JSON）
\`\`\`json
{
  "score": 85,
  "feedback": "优点：理解核心概念，逻辑清晰。不足：缺少性能数据，未提及实际应用场景",
  "comparison": "用户答案覆盖了参考答案的 70%，主要差异在于：1. 未提及调度机制；2. 缺少实际项目案例"
}
\`\`\`

## 注意事项
- 输出必须是合法 JSON
- score 必须是 0-100 的整数
- 所有字段必须存在，不可为空
- 严禁输出 undefined/null 等 JS 值`,
);

export interface InterviewScoreInput {
  question: InterviewQuestion;
  userAnswer: string;
  resumeZhContent: string;
}

export function buildInterviewScoreUserMessage(input: InterviewScoreInput): string {
  const { question, userAnswer, resumeZhContent } = input;
  return `请对以下面试答案进行评分。

# 题目信息
- 题型：${question.type}
- 题目：${question.question}
- 参考答案：${question.referenceAnswer}
- 答题思路：${question.answerStrategy}

# 候选人简历（中文版，用于判断答案真实性）
${resumeZhContent}

# 候选人答案
${userAnswer}

请严格按照系统提示词中的 JSON 格式输出评分结果。`;
}

export function buildInterviewScoreMessages(input: InterviewScoreInput) {
  return [
    { role: "system" as const, content: INTERVIEW_SCORE_SYSTEM_PROMPT },
    { role: "user" as const, content: buildInterviewScoreUserMessage(input) },
  ];
}

export interface InterviewScoreResult {
  score: number;
  feedback: string;
  comparison: string;
}

export function parseInterviewScoreResult(raw: string): InterviewScoreResult {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const sanitized = cleaned
      .replace(/:\s*undefined\s*([,}])/g, ': ""$1')
      .replace(/:\s*null\s*([,}])/g, ': ""$1');
    const parsed = JSON.parse(sanitized);

    const score = Number(parsed.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`score 必须是 0-100 的整数，当前为 ${String(parsed.score)}`);
    }

    return {
      score: Math.round(score),
      feedback: String(parsed.feedback ?? ""),
      comparison: String(parsed.comparison ?? ""),
    };
  } catch (err) {
    throw new Error(
      `面试评分解析失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
