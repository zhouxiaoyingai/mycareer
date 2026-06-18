# 阶段5：模拟面试功能 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 基于 JD + 简历生成 8 道针对性面试题，用户文字作答后 AI 逐题评分 + 整体评分，支持多次答题保留历史。

**架构：** 两集合分离（interviews 题集 + interview_sessions 答题会话）。题集不可变含简历/JD 快照；每次答题新建会话，逐题 AI 评分，全部答完后生成整体评分。触发入口在 JD 详情页和定制简历详情页。

**技术栈：** Next.js 14 App Router + CloudBase NoSQL + DeepSeek API + shadcn/ui + Tailwind

---

## 文件结构

### 类型定义
- 创建：`types/interview.ts`

### 数据访问层
- 创建：`lib/cloudbase/interviews.ts`
- 创建：`lib/cloudbase/interview-sessions.ts`
- 修改：`lib/cloudbase/db.ts` — Collections 新增 INTERVIEWS、INTERVIEW_SESSIONS

### 提示词
- 创建：`lib/ai/prompts/interview-generate.ts`
- 创建：`lib/ai/prompts/interview-score.ts`
- 创建：`lib/ai/prompts/interview-overall.ts`
- 创建：`lib/ai/prompts/__tests__/interview-generate.test.ts`
- 创建：`lib/ai/prompts/__tests__/interview-score.test.ts`

### API 路由
- 创建：`app/api/interviews/route.ts` — POST 生成题集 + GET 列表
- 创建：`app/api/interviews/[id]/route.ts` — GET 详情 + DELETE 删除
- 创建：`app/api/interviews/[id]/sessions/route.ts` — POST 新建会话 + GET 会话列表
- 创建：`app/api/interviews/[id]/sessions/[sid]/route.ts` — GET 会话详情
- 创建：`app/api/interviews/[id]/sessions/[sid]/answer/route.ts` — POST 提交单题答案
- 创建：`app/api/interviews/[id]/sessions/[sid]/complete/route.ts` — POST 完成会话
- 创建：`app/api/jds/[id]/interview/route.ts` — JD 详情页触发生成
- 创建：`app/api/resumes/[id]/interview/route.ts` — 定制简历详情页触发生成

### 前端页面
- 修改：`app/(main)/interview/page.tsx` — 列表页（从占位页改造）
- 创建：`app/(main)/interview/[id]/page.tsx` — 题集详情页
- 创建：`app/(main)/interview/[id]/sessions/[sid]/page.tsx` — 答题演练页

### 触发入口
- 修改：`app/(main)/jd/[id]/page.tsx` — 新增"生成面试题"按钮
- 修改：`app/(main)/resume/[id]/page.tsx` — 新增"生成面试题"按钮

---

## 任务 1：类型定义

**文件：** 创建 `types/interview.ts`

- [ ] **步骤 1：创建类型定义文件**

```typescript
/**
 * 模拟面试相关类型定义
 */

export type QuestionType = "technical" | "behavioral" | "case" | "general";

export const questionTypeLabels: Record<QuestionType, string> = {
  technical: "技术题",
  behavioral: "行为题",
  case: "案例题",
  general: "通用题",
};

export interface InterviewQuestion {
  id: string;
  type: QuestionType;
  question: string;
  referenceAnswer: string;
  answerStrategy: string;
}

export type InterviewStatus = "generated" | "archived";

export interface ResumeSnapshot {
  resumeId: string;
  targetRole?: string;
  contentZh: string;
}

export interface JdSnapshot {
  jdId: string;
  title: string;
  company?: string;
  hardSkills: Array<{ name: string; weight: number }>;
}

export interface Interview {
  _id: string;
  userId: string;
  resumeId: string;
  jdId: string;
  resumeSnapshot: ResumeSnapshot;
  jdSnapshot: JdSnapshot;
  questionTypes: QuestionType[];
  questions: InterviewQuestion[];
  status: InterviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewListItem {
  _id: string;
  jdId: string;
  jdTitle: string;
  jdCompany?: string;
  resumeId: string;
  questionCount: number;
  questionTypes: QuestionType[];
  status: InterviewStatus;
  sessionCount: number;
  bestScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionAnswer {
  questionId: string;
  userAnswer: string;
  score: number;
  feedback: string;
  comparison: string;
  scoredAt: Date;
}

export type SessionStatus = "in_progress" | "completed";

export interface InterviewSession {
  _id: string;
  userId: string;
  interviewId: string;
  answers: SessionAnswer[];
  overallScore?: number;
  overallFeedback?: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionListItem {
  _id: string;
  status: SessionStatus;
  answeredCount: number;
  totalQuestions: number;
  overallScore?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **步骤 2：Commit**

```bash
git add types/interview.ts
git commit -m "feat(phase5): 新增面试相关类型定义"
```

---

## 任务 2：扩展 Collections 常量

**文件：** 修改 `lib/cloudbase/db.ts`

- [ ] **步骤 1：在 Collections 中新增两个集合**

将 Collections 对象替换为：

```typescript
export const Collections = {
  USERS: "users",
  RESUMES: "resumes",
  JDS: "jds",
  GREETINGS: "greetings",
  INTERVIEWS: "interviews",
  INTERVIEW_SESSIONS: "interview_sessions",
  APPLICATIONS: "applications",
} as const;
```

- [ ] **步骤 2：Commit**

```bash
git add lib/cloudbase/db.ts
git commit -m "feat(phase5): Collections 新增 interviews 和 interview_sessions"
```

---

## 任务 3：面试题集数据访问层

**文件：** 创建 `lib/cloudbase/interviews.ts`

- [ ] **步骤 1：创建 interviews 数据访问层**

```typescript
/**
 * 面试题集数据访问层
 */

import { Collections, insertOne, findOne, findMany, deleteOne } from "./db";
import type {
  Interview,
  InterviewListItem,
  InterviewQuestion,
  QuestionType,
  ResumeSnapshot,
  JdSnapshot,
  InterviewStatus,
} from "@/types/interview";

export interface CreateInterviewInput {
  userId: string;
  resumeId: string;
  jdId: string;
  resumeSnapshot: ResumeSnapshot;
  jdSnapshot: JdSnapshot;
  questionTypes: QuestionType[];
  questions: InterviewQuestion[];
  status?: InterviewStatus;
}

export async function createInterview(input: CreateInterviewInput): Promise<Interview> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    resumeId: input.resumeId,
    jdId: input.jdId,
    resumeSnapshot: input.resumeSnapshot,
    jdSnapshot: input.jdSnapshot,
    questionTypes: input.questionTypes,
    questions: input.questions,
    status: input.status ?? ("generated" as InterviewStatus),
    createdAt: now,
    updatedAt: now,
  };
  const id = await insertOne(Collections.INTERVIEWS, doc);
  return { _id: id, ...doc } as Interview;
}

export async function getInterviewById(id: string, userId: string): Promise<Interview | null> {
  const interview = await findOne<Interview>(Collections.INTERVIEWS, { _id: id });
  if (!interview || interview.userId !== userId) return null;
  return interview;
}

export async function listInterviewsByUser(
  userId: string,
  options?: { jdId?: string; limit?: number },
): Promise<InterviewListItem[]> {
  const query: Record<string, unknown> = { userId };
  if (options?.jdId) query.jdId = options.jdId;
  const interviews = await findMany<Interview>(Collections.INTERVIEWS, query, {
    orderBy: { field: "updatedAt", direction: "desc" },
    limit: options?.limit ?? 50,
  });
  return interviews.map((i) => ({
    _id: i._id,
    jdId: i.jdId,
    jdTitle: i.jdSnapshot.title,
    jdCompany: i.jdSnapshot.company,
    resumeId: i.resumeId,
    questionCount: i.questions.length,
    questionTypes: i.questionTypes,
    status: i.status,
    sessionCount: 0,
    bestScore: undefined,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));
}

export async function deleteInterview(id: string, userId: string): Promise<void> {
  const existing = await getInterviewById(id, userId);
  if (!existing) throw new Error("面试题集不存在或无权访问");
  await deleteOne(Collections.INTERVIEWS, id);
}
```

- [ ] **步骤 2：Commit**

```bash
git add lib/cloudbase/interviews.ts
git commit -m "feat(phase5): 面试题集数据访问层"
```

---

## 任务 4：答题会话数据访问层

**文件：** 创建 `lib/cloudbase/interview-sessions.ts`

- [ ] **步骤 1：创建 interview_sessions 数据访问层**

```typescript
/**
 * 答题会话数据访问层
 */

import { Collections, insertOne, findOne, findMany, updateOne } from "./db";
import type {
  InterviewSession,
  SessionListItem,
  SessionAnswer,
  SessionStatus,
} from "@/types/interview";

export interface CreateSessionInput {
  userId: string;
  interviewId: string;
  status?: SessionStatus;
}

export async function createSession(input: CreateSessionInput): Promise<InterviewSession> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    interviewId: input.interviewId,
    answers: [] as SessionAnswer[],
    status: input.status ?? ("in_progress" as SessionStatus),
    createdAt: now,
    updatedAt: now,
  };
  const id = await insertOne(Collections.INTERVIEW_SESSIONS, doc);
  return { _id: id, ...doc } as InterviewSession;
}

export async function getSessionById(id: string, userId: string): Promise<InterviewSession | null> {
  const session = await findOne<InterviewSession>(Collections.INTERVIEW_SESSIONS, { _id: id });
  if (!session || session.userId !== userId) return null;
  return session;
}

export async function listSessionsByInterview(
  interviewId: string,
  userId: string,
): Promise<SessionListItem[]> {
  const sessions = await findMany<InterviewSession>(
    Collections.INTERVIEW_SESSIONS,
    { userId, interviewId },
    { orderBy: { field: "createdAt", direction: "desc" } },
  );
  return sessions.map((s) => ({
    _id: s._id,
    status: s.status,
    answeredCount: s.answers.length,
    totalQuestions: 0,
    overallScore: s.overallScore,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export interface UpdateSessionInput {
  answers?: SessionAnswer[];
  overallScore?: number;
  overallFeedback?: string;
  status?: SessionStatus;
}

export async function updateSession(
  id: string,
  userId: string,
  update: UpdateSessionInput,
): Promise<void> {
  const existing = await getSessionById(id, userId);
  if (!existing) throw new Error("答题会话不存在或无权访问");
  await updateOne(Collections.INTERVIEW_SESSIONS, id, update as Record<string, unknown>);
}

/**
 * 批量查询多个题集的会话统计
 */
export async function getSessionStatsByInterviewIds(
  interviewIds: string[],
  userId: string,
): Promise<Map<string, { sessionCount: number; bestScore?: number }>> {
  const result = new Map<string, { sessionCount: number; bestScore?: number }>();
  if (interviewIds.length === 0) return result;

  const sessions = await findMany<InterviewSession>(
    Collections.INTERVIEW_SESSIONS,
    { userId, interviewId: { $in: interviewIds } },
    { limit: 500 },
  );

  for (const s of sessions) {
    const existing = result.get(s.interviewId) ?? { sessionCount: 0 };
    existing.sessionCount += 1;
    if (s.overallScore !== undefined) {
      if (existing.bestScore === undefined || s.overallScore > existing.bestScore) {
        existing.bestScore = s.overallScore;
      }
    }
    result.set(s.interviewId, existing);
  }
  return result;
}
```

- [ ] **步骤 2：Commit**

```bash
git add lib/cloudbase/interview-sessions.ts
git commit -m "feat(phase5): 答题会话数据访问层"
```

---

## 任务 5：面试题生成提示词 + 测试（TDD）

**文件：**
- 创建：`lib/ai/prompts/interview-generate.ts`
- 创建：`lib/ai/prompts/__tests__/interview-generate.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `lib/ai/prompts/__tests__/interview-generate.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import {
  INTERVIEW_GENERATE_SYSTEM_PROMPT,
  buildInterviewGenerateMessages,
  parseInterviewGenerateResult,
} from "../interview-generate";
import type { JdStructured } from "@/types/jd";

describe("interview-generate 提示词", () => {
  it("系统提示词应包含防幻觉规则", () => {
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("防幻觉三维度规则");
  });

  it("系统提示词应包含 4 种题型说明", () => {
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("技术题");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("行为题");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("案例题");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("通用题");
  });

  it("系统提示词应包含题目数量要求", () => {
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("技术题 3");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("行为题 2");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("案例题 1");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("通用题 2");
  });

  it("buildInterviewGenerateMessages 应包含 JD 和简历内容", () => {
    const jdStructured: JdStructured = {
      title: "高级前端工程师",
      company: "字节跳动",
      employmentType: "全职",
      experienceLevel: "高级",
      hardSkills: [{ name: "React", weight: 5, context: "必须精通" }],
      softSkills: [{ name: "团队协作", weight: 4, context: "跨部门协作" }],
      industryTerms: [],
      responsibilities: ["负责前端架构"],
      requirements: ["5年前端经验"],
      niceToHave: [],
    };
    const messages = buildInterviewGenerateMessages({
      jdStructured,
      resumeZhContent: "张三，5年前端工程师，精通 React",
    });
    expect(messages[1].content).toContain("高级前端工程师");
    expect(messages[1].content).toContain("字节跳动");
    expect(messages[1].content).toContain("React");
    expect(messages[1].content).toContain("张三");
  });

  it("parseInterviewGenerateResult 应正确解析 8 题", () => {
    const mockResponse = JSON.stringify({
      questions: Array.from({ length: 8 }, (_, i) => ({
        id: `q${i + 1}`,
        type: i < 3 ? "technical" : i < 5 ? "behavioral" : i < 6 ? "case" : "general",
        question: `题${i + 1}`,
        referenceAnswer: `答${i + 1}`,
        answerStrategy: `思路${i + 1}`,
      })),
    });
    const result = parseInterviewGenerateResult(mockResponse);
    expect(result.questions).toHaveLength(8);
    expect(result.questions[0].id).toBe("q1");
    expect(result.questions[0].type).toBe("technical");
    expect(result.questions[6].type).toBe("general");
  });

  it("parseInterviewGenerateResult 应在题目数量不足时抛错", () => {
    const mockResponse = JSON.stringify({
      questions: [
        { id: "q1", type: "technical", question: "题1", referenceAnswer: "答1", answerStrategy: "思路1" },
      ],
    });
    expect(() => parseInterviewGenerateResult(mockResponse)).toThrow();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run lib/ai/prompts/__tests__/interview-generate.test.ts`
预期：FAIL，报错 "Cannot find module '../interview-generate'"

- [ ] **步骤 3：编写实现代码**

创建 `lib/ai/prompts/interview-generate.ts`：

```typescript
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
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run lib/ai/prompts/__tests__/interview-generate.test.ts`
预期：PASS，6 个测试全部通过

- [ ] **步骤 5：Commit**

```bash
git add lib/ai/prompts/interview-generate.ts lib/ai/prompts/__tests__/interview-generate.test.ts
git commit -m "feat(phase5): 面试题生成提示词 + 测试"
```

---

## 任务 6：逐题评分提示词 + 测试（TDD）

**文件：**
- 创建：`lib/ai/prompts/interview-score.ts`
- 创建：`lib/ai/prompts/__tests__/interview-score.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `lib/ai/prompts/__tests__/interview-score.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import {
  INTERVIEW_SCORE_SYSTEM_PROMPT,
  buildInterviewScoreMessages,
  parseInterviewScoreResult,
} from "../interview-score";
import type { InterviewQuestion } from "@/types/interview";

describe("interview-score 提示词", () => {
  it("系统提示词应包含防幻觉规则", () => {
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("防幻觉三维度规则");
  });

  it("系统提示词应包含评分标准", () => {
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("90-100");
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("70-89");
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("50-69");
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("0-49");
  });

  it("buildInterviewScoreMessages 应包含题目和用户答案", () => {
    const question: InterviewQuestion = {
      id: "q1",
      type: "technical",
      question: "说说 React Fiber",
      referenceAnswer: "Fiber 是...",
      answerStrategy: "从架构动机回答",
    };
    const messages = buildInterviewScoreMessages({
      question,
      userAnswer: "Fiber 是 React 16 的架构",
      resumeZhContent: "张三，5年前端工程师",
    });
    expect(messages[1].content).toContain("说说 React Fiber");
    expect(messages[1].content).toContain("Fiber 是...");
    expect(messages[1].content).toContain("Fiber 是 React 16 的架构");
    expect(messages[1].content).toContain("张三");
  });

  it("parseInterviewScoreResult 应正确解析", () => {
    const mockResponse = JSON.stringify({
      score: 85,
      feedback: "优点：理解核心概念。不足：缺少细节",
      comparison: "用户答案覆盖了参考答案的 70%",
    });
    const result = parseInterviewScoreResult(mockResponse);
    expect(result.score).toBe(85);
    expect(result.feedback).toContain("优点");
    expect(result.comparison).toContain("70%");
  });

  it("parseInterviewScoreResult 应在 score 越界时抛错", () => {
    const mockResponse = JSON.stringify({
      score: 150,
      feedback: "test",
      comparison: "test",
    });
    expect(() => parseInterviewScoreResult(mockResponse)).toThrow();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run lib/ai/prompts/__tests__/interview-score.test.ts`
预期：FAIL，报错 "Cannot find module '../interview-score'"

- [ ] **步骤 3：编写实现代码**

创建 `lib/ai/prompts/interview-score.ts`：

```typescript
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
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run lib/ai/prompts/__tests__/interview-score.test.ts`
预期：PASS，5 个测试全部通过

- [ ] **步骤 5：Commit**

```bash
git add lib/ai/prompts/interview-score.ts lib/ai/prompts/__tests__/interview-score.test.ts
git commit -m "feat(phase5): 逐题评分提示词 + 测试"
```

---

## 任务 7：整体评分提示词

**文件：** 创建 `lib/ai/prompts/interview-overall.ts`

- [ ] **步骤 1：编写实现代码**

```typescript
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
```

- [ ] **步骤 2：Commit**

```bash
git add lib/ai/prompts/interview-overall.ts
git commit -m "feat(phase5): 整体评分提示词"
```

---

## 任务 8：面试题集列表 + 创建 API

**文件：** 创建 `app/api/interviews/route.ts`

- [ ] **步骤 1：创建 interviews 列表 + 创建 API**

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { createInterview, listInterviewsByUser } from "@/lib/cloudbase/interviews";
import { getSessionStatsByInterviewIds } from "@/lib/cloudbase/interview-sessions";
import { getJdById } from "@/lib/cloudbase/jds";
import { getResumeById } from "@/lib/cloudbase/resumes";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewGenerateMessages,
  parseInterviewGenerateResult,
} from "@/lib/ai/prompts/interview-generate";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  validationErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const jdId = searchParams.get("jdId") ?? undefined;
    const limitParam = searchParams.get("limit");

    let limit: number | undefined;
    if (limitParam) {
      const parsed = Number.parseInt(limitParam, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
        return validationErrorResponse("limit 参数应为 1-100 之间的整数");
      }
      limit = parsed;
    }

    const interviews = await listInterviewsByUser(session.userId, { jdId, limit });
    const interviewIds = interviews.map((i) => i._id);
    const statsMap = await getSessionStatsByInterviewIds(interviewIds, session.userId);
    const interviewsWithStats = interviews.map((i) => {
      const stats = statsMap.get(i._id);
      return {
        ...i,
        sessionCount: stats?.sessionCount ?? 0,
        bestScore: stats?.bestScore,
      };
    });

    return successResponse({ interviews: interviewsWithStats });
  } catch (error) {
    console.error("获取面试题集列表失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取面试题集列表失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const createSchema = z.object({
  jdId: z.string().min(1, "jdId 不可为空"),
  resumeId: z.string().min(1, "resumeId 不可为空"),
  questionTypes: z
    .array(z.enum(["technical", "behavioral", "case", "general"]))
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { jdId, resumeId } = parsed.data;

    const jd = await getJdById(jdId, session.userId);
    if (!jd) return validationErrorResponse("JD 不存在或无权访问");

    const resume = await getResumeById(resumeId, session.userId);
    if (!resume) return validationErrorResponse("简历不存在或无权访问");
    if (!resume.content?.zh) return validationErrorResponse("简历缺少中文版内容");

    const resumeSnapshot = {
      resumeId: resume._id,
      targetRole: resume.targetRole,
      contentZh: resume.content.zh,
    };
    const jdSnapshot = {
      jdId: jd._id,
      title: jd.structured.title,
      company: jd.structured.company,
      hardSkills: jd.structured.hardSkills.map((s) => ({ name: s.name, weight: s.weight })),
    };

    const messages = buildInterviewGenerateMessages({
      jdStructured: jd.structured,
      resumeZhContent: resume.content.zh,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    const result = parseInterviewGenerateResult(aiResponse.content);

    const interview = await createInterview({
      userId: session.userId,
      resumeId: resume._id,
      jdId: jd._id,
      resumeSnapshot,
      jdSnapshot,
      questionTypes: parsed.data.questionTypes ?? ["technical", "behavioral", "case", "general"],
      questions: result.questions,
    });

    return successResponse({ interview, usage: aiResponse.usage }, 201);
  } catch (error) {
    console.error("生成面试题失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `生成面试题失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/interviews/route.ts
git commit -m "feat(phase5): 面试题集列表 + 创建 API"
```

---

## 任务 9：面试题集详情 + 删除 API

**文件：** 创建 `app/api/interviews/[id]/route.ts`

- [ ] **步骤 1：创建详情 + 删除 API**

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById, deleteInterview } from "@/lib/cloudbase/interviews";
import { listSessionsByInterview } from "@/lib/cloudbase/interview-sessions";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const sessions = await listSessionsByInterview(params.id, session.userId);
    const sessionsWithTotal = sessions.map((s) => ({
      ...s,
      totalQuestions: interview.questions.length,
    }));

    return successResponse({ interview, sessions: sessionsWithTotal });
  } catch (error) {
    console.error("获取面试题集详情失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取面试题集详情失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    await deleteInterview(params.id, session.userId);
    return successResponse({ deleted: true });
  } catch (error) {
    console.error("删除面试题集失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("不存在")) {
      return errorResponse("NOT_FOUND", error.message, 404);
    }
    return internalErrorResponse(
      `删除面试题集失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/interviews/[id]/route.ts
git commit -m "feat(phase5): 面试题集详情 + 删除 API"
```

---

## 任务 10：答题会话 API（新建 + 列表 + 详情）

**文件：**
- 创建：`app/api/interviews/[id]/sessions/route.ts`
- 创建：`app/api/interviews/[id]/sessions/[sid]/route.ts`

- [ ] **步骤 1：创建会话新建 + 列表 API**

创建 `app/api/interviews/[id]/sessions/route.ts`：

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById } from "@/lib/cloudbase/interviews";
import { createSession, listSessionsByInterview } from "@/lib/cloudbase/interview-sessions";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const sessions = await listSessionsByInterview(params.id, session.userId);
    const sessionsWithTotal = sessions.map((s) => ({
      ...s,
      totalQuestions: interview.questions.length,
    }));

    return successResponse({ sessions: sessionsWithTotal });
  } catch (error) {
    console.error("获取会话列表失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取会话列表失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const newSession = await createSession({
      userId: session.userId,
      interviewId: params.id,
    });

    return successResponse({ session: newSession }, 201);
  } catch (error) {
    console.error("创建答题会话失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `创建答题会话失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 2：创建会话详情 API**

创建 `app/api/interviews/[id]/sessions/[sid]/route.ts`：

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById } from "@/lib/cloudbase/interviews";
import { getSessionById } from "@/lib/cloudbase/interview-sessions";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; sid: string } },
) {
  try {
    const session = await requireAuth();
    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const sessionData = await getSessionById(params.sid, session.userId);
    if (!sessionData) return errorResponse("NOT_FOUND", "答题会话不存在或无权访问", 404);
    if (sessionData.interviewId !== params.id) {
      return errorResponse("NOT_FOUND", "会话不属于该题集", 404);
    }

    return successResponse({ interview, session: sessionData });
  } catch (error) {
    console.error("获取会话详情失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取会话详情失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 3：Commit**

```bash
git add app/api/interviews/[id]/sessions/route.ts app/api/interviews/[id]/sessions/[sid]/route.ts
git commit -m "feat(phase5): 答题会话新建/列表/详情 API"
```

---

## 任务 11：提交单题答案 API

**文件：** 创建 `app/api/interviews/[id]/sessions/[sid]/answer/route.ts`

- [ ] **步骤 1：创建提交答案 API**

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById } from "@/lib/cloudbase/interviews";
import { getSessionById, updateSession } from "@/lib/cloudbase/interview-sessions";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewScoreMessages,
  parseInterviewScoreResult,
} from "@/lib/ai/prompts/interview-score";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  questionId: z.string().min(1, "questionId 不可为空"),
  userAnswer: z.string().min(1, "userAnswer 不可为空"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sid: string } },
) {
  try {
    const session = await requireAuth();

    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const sessionData = await getSessionById(params.sid, session.userId);
    if (!sessionData) return errorResponse("NOT_FOUND", "答题会话不存在或无权访问", 404);
    if (sessionData.interviewId !== params.id) {
      return errorResponse("NOT_FOUND", "会话不属于该题集", 404);
    }
    if (sessionData.status === "completed") {
      return validationErrorResponse("该会话已完成，不可再提交答案");
    }

    const body = await request.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { questionId, userAnswer } = parsed.data;
    const question = interview.questions.find((q) => q.id === questionId);
    if (!question) return validationErrorResponse(`题目 ${questionId} 不存在`);

    const existingAnswer = sessionData.answers.find((a) => a.questionId === questionId);
    if (existingAnswer) return validationErrorResponse(`题目 ${questionId} 已答过`);

    const messages = buildInterviewScoreMessages({
      question,
      userAnswer,
      resumeZhContent: interview.resumeSnapshot.contentZh,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.3,
      maxTokens: 1024,
      responseFormat: "json_object",
    });

    const result = parseInterviewScoreResult(aiResponse.content);

    const newAnswer = {
      questionId,
      userAnswer,
      score: result.score,
      feedback: result.feedback,
      comparison: result.comparison,
      scoredAt: new Date(),
    };

    const updatedAnswers = [...sessionData.answers, newAnswer];
    await updateSession(params.sid, session.userId, { answers: updatedAnswers });

    return successResponse({ answer: newAnswer, usage: aiResponse.usage });
  } catch (error) {
    console.error("提交答案失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `提交答案失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/interviews/[id]/sessions/[sid]/answer/route.ts
git commit -m "feat(phase5): 提交单题答案 API（逐题评分）"
```

---

## 任务 12：完成会话 API（整体评分）

**文件：** 创建 `app/api/interviews/[id]/sessions/[sid]/complete/route.ts`

- [ ] **步骤 1：创建完成会话 API**

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getInterviewById } from "@/lib/cloudbase/interviews";
import { getSessionById, updateSession } from "@/lib/cloudbase/interview-sessions";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewOverallMessages,
  parseInterviewOverallResult,
} from "@/lib/ai/prompts/interview-overall";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; sid: string } },
) {
  try {
    const session = await requireAuth();

    const interview = await getInterviewById(params.id, session.userId);
    if (!interview) return errorResponse("NOT_FOUND", "面试题集不存在或无权访问", 404);

    const sessionData = await getSessionById(params.sid, session.userId);
    if (!sessionData) return errorResponse("NOT_FOUND", "答题会话不存在或无权访问", 404);
    if (sessionData.interviewId !== params.id) {
      return errorResponse("NOT_FOUND", "会话不属于该题集", 404);
    }
    if (sessionData.status === "completed") {
      return validationErrorResponse("该会话已完成");
    }
    if (sessionData.answers.length === 0) {
      return validationErrorResponse("至少答完 1 题才能完成会话");
    }

    const messages = buildInterviewOverallMessages({
      questions: interview.questions,
      answers: sessionData.answers,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.5,
      maxTokens: 1024,
      responseFormat: "json_object",
    });

    const result = parseInterviewOverallResult(aiResponse.content);

    await updateSession(params.sid, session.userId, {
      overallScore: result.overallScore,
      overallFeedback: result.overallFeedback,
      status: "completed",
    });

    return successResponse({
      overallScore: result.overallScore,
      overallFeedback: result.overallFeedback,
      usage: aiResponse.usage,
    });
  } catch (error) {
    console.error("完成会话失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `完成会话失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/interviews/[id]/sessions/[sid]/complete/route.ts
git commit -m "feat(phase5): 完成会话 API（整体评分）"
```

---

## 任务 13：JD 详情页触发生成面试题 API

**文件：** 创建 `app/api/jds/[id]/interview/route.ts`

- [ ] **步骤 1：创建 JD 触发生成面试题 API**

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getJdById } from "@/lib/cloudbase/jds";
import { getResumeById, listResumesByUser } from "@/lib/cloudbase/resumes";
import { createInterview } from "@/lib/cloudbase/interviews";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewGenerateMessages,
  parseInterviewGenerateResult,
} from "@/lib/ai/prompts/interview-generate";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";
import type { Resume } from "@/types/resume";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();

    const jd = await getJdById(params.id, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "JD 不存在或无权访问", 404);

    // 优先查找该 JD 关联的定制简历
    const tailoredResumes = await listResumesByUser(session.userId, { type: "tailored" });
    let resume: Resume | null = null;
    let resumeId: string | undefined;

    for (const r of tailoredResumes) {
      const fullResume = await getResumeById(r._id, session.userId);
      if (fullResume?.jdId === jd._id) {
        resume = fullResume;
        resumeId = r._id;
        break;
      }
    }

    // 若无定制简历，使用标准版
    if (!resume) {
      const standardResumes = await listResumesByUser(session.userId, {
        type: "standard",
        status: "completed",
      });
      if (standardResumes.length === 0) {
        return validationErrorResponse("请先创建标准版简历");
      }
      resume = await getResumeById(standardResumes[0]._id, session.userId);
      resumeId = standardResumes[0]._id;
    }

    if (!resume || !resumeId) return validationErrorResponse("简历不存在或无权访问");
    if (!resume.content?.zh) return validationErrorResponse("简历缺少中文版内容");

    const resumeSnapshot = {
      resumeId: resume._id,
      targetRole: resume.targetRole,
      contentZh: resume.content.zh,
    };
    const jdSnapshot = {
      jdId: jd._id,
      title: jd.structured.title,
      company: jd.structured.company,
      hardSkills: jd.structured.hardSkills.map((s) => ({ name: s.name, weight: s.weight })),
    };

    const messages = buildInterviewGenerateMessages({
      jdStructured: jd.structured,
      resumeZhContent: resume.content.zh,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    const result = parseInterviewGenerateResult(aiResponse.content);

    const interview = await createInterview({
      userId: session.userId,
      resumeId,
      jdId: jd._id,
      resumeSnapshot,
      jdSnapshot,
      questionTypes: ["technical", "behavioral", "case", "general"],
      questions: result.questions,
    });

    return successResponse({ interview, usage: aiResponse.usage }, 201);
  } catch (error) {
    console.error("JD 触发生成面试题失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `生成面试题失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/jds/[id]/interview/route.ts
git commit -m "feat(phase5): JD 详情页触发生成面试题 API"
```

---

## 任务 14：定制简历详情页触发生成面试题 API

**文件：** 创建 `app/api/resumes/[id]/interview/route.ts`

- [ ] **步骤 1：创建定制简历触发生成面试题 API**

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getResumeById } from "@/lib/cloudbase/resumes";
import { getJdById } from "@/lib/cloudbase/jds";
import { createInterview } from "@/lib/cloudbase/interviews";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import {
  buildInterviewGenerateMessages,
  parseInterviewGenerateResult,
} from "@/lib/ai/prompts/interview-generate";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();

    const resume = await getResumeById(params.id, session.userId);
    if (!resume) return errorResponse("NOT_FOUND", "简历不存在或无权访问", 404);

    if (resume.type !== "tailored") {
      return validationErrorResponse("仅支持定制版简历生成面试题");
    }
    if (!resume.jdId) return validationErrorResponse("该简历缺少关联的 JD");
    if (!resume.content?.zh) return validationErrorResponse("简历缺少中文版内容");

    const jd = await getJdById(resume.jdId, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "关联的 JD 不存在", 404);

    const resumeSnapshot = {
      resumeId: resume._id,
      targetRole: resume.targetRole,
      contentZh: resume.content.zh,
    };
    const jdSnapshot = {
      jdId: jd._id,
      title: jd.structured.title,
      company: jd.structured.company,
      hardSkills: jd.structured.hardSkills.map((s) => ({ name: s.name, weight: s.weight })),
    };

    const messages = buildInterviewGenerateMessages({
      jdStructured: jd.structured,
      resumeZhContent: resume.content.zh,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    const result = parseInterviewGenerateResult(aiResponse.content);

    const interview = await createInterview({
      userId: session.userId,
      resumeId: resume._id,
      jdId: jd._id,
      resumeSnapshot,
      jdSnapshot,
      questionTypes: ["technical", "behavioral", "case", "general"],
      questions: result.questions,
    });

    return successResponse({ interview, usage: aiResponse.usage }, 201);
  } catch (error) {
    console.error("定制简历触发生成面试题失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof Error && error.message.includes("解析失败")) {
      return errorResponse("AI_PARSE_ERROR", error.message, 502);
    }
    return internalErrorResponse(
      `生成面试题失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/resumes/[id]/interview/route.ts
git commit -m "feat(phase5): 定制简历详情页触发生成面试题 API"
```

---

## 任务 15-18：前端页面与触发入口

> 详见后续任务说明。前端页面（列表页、题集详情页、答题演练页）和触发入口（JD 详情页、定制简历详情页新增"生成面试题"按钮）的实现遵循现有 shadcn/ui 模式，参考 `app/(main)/greeting/page.tsx` 和 `app/(main)/resume/[id]/page.tsx` 的代码风格。

### 任务 15：面试列表页
- 修改 `app/(main)/interview/page.tsx`：从占位页改造为题集列表，展示 JD 标题、题目数量、演练次数、最高分，支持删除和跳转详情

### 任务 16：题集详情页
- 创建 `app/(main)/interview/[id]/page.tsx`：展示题目列表（折叠式含参考答案）+ 历史会话列表 + "开始答题"按钮

### 任务 17：答题演练页
- 创建 `app/(main)/interview/[id]/sessions/[sid]/page.tsx`：逐题作答 + 即时评分展示 + 完成演练按钮 + 整体评分展示

### 任务 18：触发入口
- 修改 `app/(main)/jd/[id]/page.tsx`：在"生成定制简历"卡片下方新增"生成面试题"卡片
- 修改 `app/(main)/resume/[id]/page.tsx`：在定制简历详情页新增"生成面试题"按钮

---

## 任务 19：全量测试 + 端到端验证 + 推送

- [ ] **步骤 1：运行 TypeScript 编译检查**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 2：运行单元测试**

运行：`npx vitest run`
预期：所有测试通过

- [ ] **步骤 3：启动 dev server 进行端到端测试**

运行：`npm run dev`

测试流程：
1. 访问 `/jd` → 选择 JD → 点击"生成面试题" → 验证跳转到题集详情页，显示 8 道题目
2. 点击"开始答题" → 逐题作答 → 验证即时评分 + 反馈 + 对比
3. 完成所有题目 → 点击"完成演练" → 验证整体评分 + 改进建议
4. 返回题集详情页 → 验证历史会话列表
5. 再次"开始答题" → 验证多次答题功能
6. 访问 `/interview` → 验证列表页显示所有题集 + 演练次数 + 最高分

- [ ] **步骤 4：Commit 并推送**

```bash
git add -A
git commit -m "feat(phase5): 模拟面试功能完成"
git push origin master
```
