/**
 * 面试题生成提示词
 */

import { injectAntiHallucinationRules } from "./shared/anti-hallucination";
import type { JdStructured } from "@/types/jd";
import type { InterviewQuestion, QuestionType } from "@/types/interview";

export const INTERVIEW_GENERATE_SYSTEM_PROMPT = injectAntiHallucinationRules(
  `你是一个资深面试官。任务是基于 JD 和候选人简历，生成 8 道针对性面试题。

## 题型与数量（共 8 题）
1. 技术题 3 道：基于 JD 技术栈深挖（如"说说 React Fiber 架构"）
2. 行为题 2 道：基于简历经历的 STAR 题（如"讲一个你主导的项目"）
3. 案例题 1 道：基于 JD 场景的设计题（如"设计一个高并发登录系统"）
4. 通用题 2 道：自我介绍/职业规划/离职原因等

## 出题原则
- 技术题聚焦 JD 中权重 ≥4 的硬技能
- 行为题基于简历中真实项目经历，不编造项目
- 案例题结合 JD 岗位职责中的实际场景
- 通用题考察职业素养和沟通能力
- 每题难度适中，避免过于简单或过于刁钻

## 防幻觉要求
- 参考答案基于简历真实经历，不编造项目/数字/技术栈
- 若简历中无相关经历，参考答案标注"基于通用最佳实践"
- 禁止使用 AI 味词（赋能/打造/夯实/抓手/闭环/心智/颗粒度等）

## 每题包含
- id: 题目唯一 ID（q1 到 q8）
- type: 题型（technical/behavioral/case/general）
- question: 题目文本
- referenceAnswer: 参考答案
- answerStrategy: 答题思路（STAR 框架/技术要点/结构化建议）

## 输出格式（严格 JSON）
\`\`\`json
{
  "questions": [
    {
      "id": "q1",
      "type": "technical",
      "question": "请说说 React Fiber 架构的原理和优势",
      "referenceAnswer": "Fiber 是 React 16 引入的...",
      "answerStrategy": "从架构动机、核心概念、调度机制三方面回答"
    }
  ]
}
\`\`\`

## 注意事项
- 输出必须是合法 JSON
- 必须生成 8 题，不可多不可少
- 所有字段必须存在，不可为空
- 严禁输出 undefined/null 等 JS 值`,
);

export interface InterviewGenerateInput {
  jdStructured: JdStructured;
  resumeZhContent: string;
}

export function buildInterviewGenerateUserMessage(input: InterviewGenerateInput): string {
  const { jdStructured, resumeZhContent } = input;
  const hardSkillsText = jdStructured.hardSkills
    .map((s) => `${s.name}（权重${s.weight}，${s.context ?? ""}）`)
    .join("、");
  const softSkillsText = jdStructured.softSkills
    .map((s) => `${s.name}（权重${s.weight}）`)
    .join("、");
  const responsibilitiesText = jdStructured.responsibilities
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");
  const requirementsText = jdStructured.requirements
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");

  return `请基于以下 JD 和简历，生成 8 道针对性面试题。

# JD 信息
- 标题：${jdStructured.title}
- 公司：${jdStructured.company ?? "未提供"}
- 经验级别：${jdStructured.experienceLevel ?? "未指定"}
- 硬技能要求：${hardSkillsText || "无"}
- 软技能要求：${softSkillsText || "无"}
- 岗位职责：
${responsibilitiesText || "无"}
- 任职要求：
${requirementsText || "无"}

# 候选人简历（中文版）
${resumeZhContent}

请严格按照系统提示词中的 JSON 格式输出 8 道题目。`;
}

export function buildInterviewGenerateMessages(input: InterviewGenerateInput) {
  return [
    { role: "system" as const, content: INTERVIEW_GENERATE_SYSTEM_PROMPT },
    { role: "user" as const, content: buildInterviewGenerateUserMessage(input) },
  ];
}

export interface InterviewGenerateResult {
  questions: InterviewQuestion[];
}

export function parseInterviewGenerateResult(raw: string): InterviewGenerateResult {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const sanitized = cleaned
      .replace(/:\s*undefined\s*([,}])/g, ': ""$1')
      .replace(/:\s*null\s*([,}])/g, ': ""$1');
    const parsed = JSON.parse(sanitized);

    if (!Array.isArray(parsed.questions)) {
      throw new Error("questions 字段缺失或非数组");
    }
    if (parsed.questions.length !== 8) {
      throw new Error(`题目数量必须为 8，当前为 ${parsed.questions.length}`);
    }

    const validTypes: QuestionType[] = ["technical", "behavioral", "case", "general"];
    const questions: InterviewQuestion[] = parsed.questions.map(
      (q: Record<string, unknown>, index: number) => {
        const type = q.type as QuestionType;
        if (!validTypes.includes(type)) {
          throw new Error(`第 ${index + 1} 题类型无效: ${String(q.type)}`);
        }
        return {
          id: typeof q.id === "string" ? q.id : `q${index + 1}`,
          type,
          question: String(q.question ?? ""),
          referenceAnswer: String(q.referenceAnswer ?? ""),
          answerStrategy: String(q.answerStrategy ?? ""),
        };
      },
    );

    return { questions };
  } catch (err) {
    throw new Error(
      `面试题解析失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
