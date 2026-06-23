# 优势识别功能实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 MyCareer 中实现"优势识别"功能，用户通过 7 步问卷探索职业方向，AI 生成可迁移技能报告和职业路径建议。

**架构：** 问卷在 `/discover` 页面以 SPA 状态机呈现（idle → answering → submitting → generating → completed/error），AI 报告通过 DeepSeek 流式生成，结果存入 `strength_reports` 集合。

**技术栈：** Next.js App Router · TypeScript · Tailwind CSS · Radix UI · CloudBase · DeepSeek API

---

## 文件结构

```
types/
  strength.ts                        # StrengthReport 类型定义（新增）

lib/cloudbase/
  db.ts                            # Collections 新增 STRENGTH_REPORTS（修改）
  strength.ts                      # CRUD 操作（新增）

lib/ai/prompts/
  strength-analyze.ts               # AI 分析 Prompt + 流式解析（新增）

app/api/strength/
  reports/route.ts                  # GET(list) / POST(create)（新增）
  reports/[id]/route.ts           # GET(detail) / DELETE（新增）

app/(main)/
  discover/page.tsx                 # 问卷 + 报告 SPA 页面（新增）

components/discover/
  questionnaire-card.tsx            # 单题卡片组件（新增）
  progress-bar.tsx                 # 进度条（含里程碑文案）（新增）
  report-view.tsx                  # 报告展示组件（新增）
  dashboard-widget.tsx             # Dashboard 引导卡片（新增）

components/layout/
  sidebar.tsx                      # 新增 discover 导航项（修改）
```

---

## 任务 1：类型定义

**文件：**
- 创建：`types/strength.ts`

- [ ] **步骤 1：创建 StrengthReport 类型定义**

```typescript
// types/strength.ts
/** 优势识别报告状态 */
export type StrengthStatus = "in_progress" | "completed";

/** 问卷原始答案 */
export interface StrengthAnswers {
  currentStage: string;
  careerClarity?: string;
  flowExperiences: string[];
  achievementType: string;
  achievementStory?: string;
  workEnvironmentPreferences: {
    remoteWork: number;
    stability: number;
    fastPaced: number;
    teamwork: number;
    independence: number;
    creativity: number;
  };
  valueRanking: string[];
  riskTolerance: string;
  learningStyle?: string[];
  yearsOfExperience: number;
}

/** 可迁移技能条目 */
export interface TransferableSkill {
  skill: string;
  transferTo: string;
  evidence: string;
}

/** 职业路径条目 */
export interface CareerPath {
  careerName: string;
  industry: string;
  skillMatch: string;
  entryPath: string;
  salaryRange: string;
  searchStrategy: string;
  transitionTime: string;
}

/** 快速起步条目 */
export interface QuickWin {
  step: string;
  resource: string;
  purpose: string;
}

/** 现实检验 */
export interface RealityCheck {
  bestFit: string;
  timelines: Array<{ path: string; phase: string; duration: string }>;
}

/** AI 报告内容 */
export interface StrengthReportContent {
  transferableSkills: TransferableSkill[];
  careerPaths: CareerPath[];
  quickWins: QuickWin[];
  realityCheck: RealityCheck;
  generatedAt: Date;
}

/** 优势识别报告（数据库对象） */
export interface StrengthReport {
  _id: string;
  userId: string;
  status: StrengthStatus;
  createdAt: Date;
  updatedAt: Date;
  answers: StrengthAnswers;
  report?: StrengthReportContent;
}
```

- [ ] **步骤 2：Commit**

```bash
git add types/strength.ts
git commit -m "feat(strength): add StrengthReport type definitions
```

---

## 任务 2：数据库 CRUD

**文件：**
- 创建：`lib/cloudbase/strength.ts`
- 修改：`lib/cloudbase/db.ts`（新增集合名）

- [ ] **步骤 1：在 db.ts 新增集合名常量**

在 `Collections` 对象中添加：

```typescript
STRENGTH_REPORTS: "strength_reports",
```

- [ ] **步骤 2：Commit db.ts**

```bash
git add lib/cloudbase/db.ts
git commit -m "chore(db): add STRENGTH_REPORTS collection"
```

- [ ] **步骤 3：创建 lib/cloudbase/strength.ts CRUD 模块**

```typescript
/**
 * 优势识别报告数据访问层
 */

import { Collections, insertOne, findOne, findMany, updateOne, deleteOne } from "./db";
import type { StrengthReport, StrengthReportContent } from "@/types/strength";

export interface CreateStrengthReportInput {
  userId: string;
  answers: StrengthReport["answers"];
}

export async function createStrengthReport(
  input: CreateStrengthReportInput
): Promise<StrengthReport> {
  const id = await insertOne(Collections.STRENGTH_REPORTS, {
    userId: input.userId,
    answers: input.answers,
    status: "in_progress",
  });
  return findOne<StrengthReport>(Collections.STRENGTH_REPORTS, { _id: id }) as Promise<StrengthReport>;
}

export async function getStrengthReportById(
  id: string,
  userId: string
): Promise<StrengthReport | null> {
  return findOne<StrengthReport>(Collections.STRENGTH_REPORTS, { _id: id, userId });
}

export async function listStrengthReportsByUser(
  userId: string,
  limit = 10,
  offset = 0
): Promise<{ reports: StrengthReport[]; total: number }> {
  const reports = await findMany<StrengthReport>(
    Collections.STRENGTH_REPORTS,
    { userId },
    { limit, orderBy: { field: "createdAt", direction: "desc" } }
  );
  // CloudBase 分页需手动 offset
  return { reports: reports.slice(offset, offset + limit), total: reports.length };
}

export async function updateStrengthReportContent(
  id: string,
  userId: string,
  report: StrengthReportContent
): Promise<void> {
  await updateOne(Collections.STRENGTH_REPORTS, { _id: id, userId }, { report, status: "completed" });
}

export async function updateStrengthReportStatus(
  id: string,
  userId: string,
  status: StrengthReport["status"]
): Promise<void> {
  await updateOne(Collections.STRENGTH_REPORTS, { _id: id, userId }, { status });
}

export async function deleteStrengthReport(id: string, userId: string): Promise<void> {
  await deleteOne(Collections.STRENGTH_REPORTS, { _id: id, userId });
}
```

- [ ] **步骤 4：Commit strength.ts**

```bash
git add lib/cloudbase/strength.ts
git commit -m "feat(strength): add CRUD operations for strength reports
```

---

## 任务 3：API 路由（POST / GET list）

**文件：**
- 创建：`app/api/strength/reports/route.ts`

- [ ] **步骤 1：创建 app/api/strength/reports/route.ts**

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { createStrengthReport, listStrengthReportsByUser } from "@/lib/cloudbase/strength";
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

    return successResponse({ id: report._id, status: report.status }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof z.ZodError) {
      return validationErrorResponse("参数校验失败", { details: error.errors });
    }
    console.error("创建优势报告失败:", error);
    return internalErrorResponse(`创建优势报告失败: ${error instanceof Error ? error.message : String(error)}`);
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
    return internalErrorResponse(`获取优势报告列表失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/strength/reports/route.ts
git commit -m "feat(api): add POST/GET /api/strength/reports"
```

---

## 任务 4：API 路由（GET detail / DELETE）

**文件：**
- 创建：`app/api/strength/reports/[id]/route.ts`

- [ ] **步骤 1：创建 app/api/strength/reports/[id]/route.ts**

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getStrengthReportById, deleteStrengthReport } from "@/lib/cloudbase/strength";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const report = await getStrengthReportById(params.id, session.userId);

    if (!report) {
      return notFoundResponse("报告不存在");
    }

    return successResponse(report);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("获取优势报告详情失败:", error);
    return internalErrorResponse(`获取优势报告详情失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const report = await getStrengthReportById(params.id, session.userId);

    if (!report) {
      return notFoundResponse("报告不存在");
    }

    await deleteStrengthReport(params.id, session.userId);
    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("删除优势报告失败:", error);
    return internalErrorResponse(`删除优势报告失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

**注意**：`notFoundResponse` 需要在 `lib/utils/response.ts` 中添加。如果已存在则直接使用，不存在则添加：

```typescript
export function notFoundResponse(message = "资源不存在"): NextResponse<ApiErrorResponse> {
  return errorResponse("NOT_FOUND", message, 404);
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/strength/reports/[id]/route.ts
git add lib/utils/response.ts  # 如果需要新增 notFoundResponse
git commit -m "feat(api): add GET/DELETE /api/strength/reports/:id"
```

---

## 任务 5：AI Prompt 模块

**文件：**
- 创建：`lib/ai/prompts/strength-analyze.ts`

- [ ] **步骤 1：创建 lib/ai/prompts/strength-analyze.ts**

```typescript
/**
 * 优势识别 AI 分析 Prompt
 * 基于用户问卷答案，生成可迁移技能和职业路径建议
 */

import type { StrengthAnswers, StrengthReportContent } from "@/types/strength";

const SYSTEM_PROMPT = `你是一位资深职业规划师和 HR，擅长从长期眼光发现人才的潜在优势。
你的职责是分析用户的技能、经验和兴趣，发现他们可能的职业规划路径。
你强调的是可迁移技能而非直接经验，为用户提供具体可执行的职业发展建议。

回答要求：
- 语言：与用户输入一致（中文）
- 薪资范围必须注明"仅供参考，来源于公开数据，不构成就业承诺"
- 投递方式提供搜索策略，不提供具体链接
- 不知道就说"暂无公开数据"，不编造
- 每个职业路径说明为什么要适合用户，基于哪些具体技能
`;

const ANSWER_CONTEXT_TEMPLATE = `用户职业背景信息：

1. 当前阶段：{currentStage}
   职业方向清晰度：{careerClarity}

2. 心流体验（做这些事时最有投入感）：
{flowExperiences}

3. 最有成就感的经历类型：
{achievementType}
{achievementStory, if present}

4. 工作环境偏好（1-5分）：
  - 远程/自由工作：{remoteWork}
  - 稳定/可预期：{stability}
  - 快节奏/高压：{fastPaced}
  - 团队协作多：{teamwork}
  - 独立自主多：{independence}
  - 创意/自由度：{creativity}

5. 工作价值观排序（从最重要到最不重要）：
{valueRanking}

6. 风险承受力：
{riskTolerance}

7. 学习风格：{learningStyle, if present}
   工作年限：{yearsOfExperience}年

请基于以上信息，生成以下JSON格式的职业发展报告：

{
  "transferableSkills": [
    {
      "skill": "技能名称",
      "transferTo": "可以迁移到的新领域/岗位",
      "evidence": "为什么这个技能可以迁移，用户的哪些经历证明了这一点"
    }
  ],
  "careerPaths": [
    {
      "careerName": "职业名称",
      "industry": "所属行业",
      "skillMatch": "用户的哪些技能与这个职业匹配，为什么",
      "entryPath": "入门途径（具体可执行的步骤）",
      "salaryRange": "薪资范围（仅供参考，注明数据来源）",
      "searchStrategy": "如何搜索这类岗位（搜索关键词策略）",
      "transitionTime": "转型到这个职业通常需要多长时间"
    }
  ],
  "quickWins": [
    {
      "step": "第一步的具体行动",
      "resource": "推荐的学习资源",
      "purpose": "这个步骤解决了什么问题/弥补了什么差距"
    }
  ],
  "realityCheck": {
    "bestFit": "根据用户所有信息，最匹配的职业方向是哪个？为什么？",
    "timelines": [
      {
        "path": "职业路径名称",
        "phase": "阶段名称（如：探索期/入门期/成长期）",
        "duration": "这个阶段通常需要多久"
      }
    ]
  }
}

要求：
- transferableSkills 返回 3-5 个条目
- careerPaths 返回 5-7 个条目，其中至少 3 个是用户可能没考虑过的"出人意料"的职业方向
- quickWins 返回 3 个条目
- timelines 返回 2-4 个条目，覆盖最适合的职业路径的各阶段
- 所有字段均用中文输出
- 只输出 JSON，不要有其他文字说明
`;

function buildContext(answers: StrengthAnswers): string {
  const flowList = answers.flowExperiences
    .map((f, i) => `  ${i + 1}. ${f}`)
    .join("\n");

  const valueList = answers.valueRanking
    .map((v, i) => `  ${i + 1}. ${v}`)
    .join("\n");

  const wp = answers.workEnvironmentPreferences;

  return ANSWER_CONTEXT_TEMPLATE
    .replace("{currentStage}", answers.currentStage)
    .replace("{careerClarity}", answers.careerClarity || "未填写")
    .replace("{flowExperiences}", flowList)
    .replace("{achievementType}", answers.achievementType)
    .replace("{achievementStory}", answers.achievementStory ? `\n   经历简述：${answers.achievementStory}` : "\n   经历简述：无")
    .replace("{remoteWork}", String(wp.remoteWork))
    .replace("{stability}", String(wp.stability))
    .replace("{fastPaced}", String(wp.fastPaced))
    .replace("{teamwork}", String(wp.teamwork))
    .replace("{independence}", String(wp.independence))
    .replace("{creativity}", String(wp.creativity))
    .replace("{valueRanking}", valueList)
    .replace("{riskTolerance}", answers.riskTolerance)
    .replace("{learningStyle}", answers.learningStyle?.join("、") || "未填写")
    .replace("{yearsOfExperience}", String(answers.yearsOfExperience));
}

/**
 * 解析流式返回的 JSON 片段，逐步拼装为完整报告对象
 */
export class StrengthReportStreamParser {
  private buffer = "";
  private reportKeys = [
    "transferableSkills",
    "careerPaths",
    "quickWins",
    "realityCheck",
  ] as const;
  private currentSection = "";
  private sectionBuffer = "";
  private report: Record<string, unknown> = {};

  /**
   * 处理每个流式 chunk
   * 返回：如果一个 section 完成，返回完成的 section 名称
   */
  public parse(chunk: string): string | null {
    this.buffer += chunk;

    // 检测是否进入了某个 section
    for (const key of this.reportKeys) {
      if (this.buffer.includes(`"${key}"`)) {
        this.currentSection = key;
      }
    }

    // 尝试提取完整的 currentSection JSON
    if (this.currentSection && this.reportKeys.includes(this.currentSection as typeof this.reportKeys[number])) {
      const startIdx = this.buffer.indexOf(`"${this.currentSection}"`);
      const arrayOrObjStart = this.buffer.indexOf(":", startIdx);
      if (arrayOrObjStart > 0) {
        const content = this.buffer.slice(arrayOrObjStart + 1).trim();
        // 简单启发式：找到闭合的 ] 或 }
        let depth = 0;
        let endIdx = -1;
        for (let i = 0; i < content.length; i++) {
          if (content[i] === "{" || content[i] === "[") depth++;
          if (content[i] === "}" || content[i] === "]") {
            depth--;
            if (depth === 0) { endIdx = i + 1; break; }
          }
        }
        if (endIdx > 0) {
          try {
            const parsed = JSON.parse(content.slice(0, endIdx));
            this.report[this.currentSection] = parsed;
            this.buffer = this.buffer.slice(startIdx + this.currentSection.length);
            const completed = this.currentSection;
            this.currentSection = "";
            return completed;
          } catch {
            // JSON 不完整，继续累积
          }
        }
      }
    }

    return null;
  }

  public getReport(): Record<string, unknown> {
    return this.report;
  }
}

export function buildStrengthAnalyzeMessages(
  answers: StrengthAnswers
): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildContext(answers) },
  ];
}

export type { StrengthReportContent };
```

- [ ] **步骤 2：Commit**

```bash
git add lib/ai/prompts/strength-analyze.ts
git commit -m "feat(ai): add strength analysis prompt module with streaming parser"
```

---

## 任务 6：问卷页面 discover/page.tsx

**文件：**
- 创建：`app/(main)/discover/page.tsx`

**注意：** 此任务较复杂，需拆分为多个子步骤，包含：
- 页面状态机管理
- 7 个问题的渲染逻辑
- 流式 AI 调用
- 进度条与缓冲文案
- 问卷答案在 localStorage 的暂存逻辑

- [ ] **步骤 1：创建 app/(main)/discover/page.tsx（SPA 状态机问卷页）**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionnaireCard } from "@/components/discover/questionnaire-card";
import { ProgressBar } from "@/components/discover/progress-bar";
import { ReportView } from "@/components/discover/report-view";
import type { StrengthAnswers, StrengthReport } from "@/types/strength";

type PageState = "idle" | "answering" | "submitting" | "generating" | "completed" | "error";

const QUESTIONS = [
  {
    id: "currentStage",
    question: "你现在处于哪个阶段？",
    type: "single" as const,
    options: [
      { value: "employed-exploring", label: "我有工作，但想看看其他机会" },
      { value: "fresh-graduate", label: "我刚毕业或即将毕业，职业方向还不确定" },
      { value: "career-transition", label: "我想转行，但对目标方向很迷茫" },
      { value: "unemployed", label: "我已经失业一段时间，不知道该从何开始" },
      { value: "self-exploration", label: "以上都不符合，我想更了解自己" },
    ],
  },
  {
    id: "flowExperiences",
    question: "回想一下，最近一次觉得"时间过得很快，做得很投入"是什么时候？",
    type: "multi" as const,
    maxSelect: 3,
    options: [
      { value: "building-things", label: "写代码/文档/内容，把想法变成具体成果时" },
      { value: "communicating", label: "和别人聊天，协调资源、解决冲突时" },
      { value: "analyzing-data", label: "分析数据、研究问题、找出规律时" },
      { value: "teaching-sharing", label: "教别人做事、分享知识、被请教时" },
      { value: "leading-projects", label: "主导项目、推动进展、对结果负责时" },
      { value: "designing", label: "画图、设计，做美感相关的事情时" },
      { value: "none-unsure", label: "还没出现过这种感觉 / 不确定" },
    ],
  },
  {
    id: "achievementType",
    question: "以下哪件事最让你有成就感？",
    type: "single" as const,
    options: [
      { value: "building-from-scratch", label: "从0到1搭建了一个东西（项目/产品/系统）" },
      { value: "persuading-others", label: "成功说服了别人接受我的想法或方案" },
      { value: "solving-hard-problems", label: "解决了别人解决不了的问题" },
      { value: "developing-people", label: "培养了一个人，看到他的成长" },
      { value: "winning-competition", label: "在竞争中获胜/超越了之前的自己" },
      { value: "creative-recognition", label: "完成了一件有创意的事，得到了认可" },
    ],
  },
] as const;
// ... Q4-Q7 类似定义（篇幅原因省略，可补充完整）

export default function DiscoverPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  const [report, setReport] = useState<StrengthReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [answers, setAnswers] = useState<Partial<StrengthAnswers>>({});

  // 从 localStorage 恢复进度
  useEffect(() => {
    const saved = localStorage.getItem("strength-draft");
    if (saved) {
      try {
        const { step, answers: savedAnswers } = JSON.parse(saved);
        setCurrentStep(step || 0);
        setAnswers(savedAnswers || {});
      } catch { /* ignore */ }
    }
  }, []);

  // 暂存当前进度到 localStorage
  const saveProgress = useCallback((step: number, ans: Partial<StrengthAnswers>) => {
    localStorage.setItem("strength-draft", JSON.stringify({ step, answers: ans }));
  }, []);

  const handleAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };
      saveProgress(currentStep, updated);
      return updated;
    });
  }, [currentStep, saveProgress]);

  const handleSubmit = useCallback(async () => {
    if (!answers.currentStage || !answers.flowExperiences || !answers.achievementType) {
      alert("请完成当前问题");
      return;
    }
    setState("submitting");
    try {
      const res = await fetch("/api/strength/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("创建报告失败");
      const { data } = await res.json();
      setReportId(data.id);
      setState("generating");
      localStorage.removeItem("strength-draft");
      // 开始流式生成
      await streamReport(data.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "提交失败");
      setState("error");
    }
  }, [answers]);

  const streamReport = async (id: string) => {
    // 流式调用（简化版，实际使用 EventSource 或 fetch stream）
    const res = await fetch(`/api/strength/reports/${id}/stream`, {
      method: "POST",
    });
    const reader = res.body?.getReader();
    if (!reader) throw new Error("无法读取流");
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // 更新报告内容（实时渲染）
      setReport((prev) => prev ? { ...prev, report: JSON.parse(chunk) } : null);
    }
    setState("completed");
  };

  // 页面状态：idle → 问卷 → 报告
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h1 className="text-3xl font-bold">发现你的职业优势</h1>
        <p className="text-muted-foreground text-center max-w-md">
          3分钟，通过精心设计的问题帮你发现被忽略的可迁移技能，开拓求职思路
        </p>
        <Button size="lg" onClick={() => setState("answering")}>开始探索</Button>
      </div>
    );
  }

  if (state === "completed" && report) {
    return <ReportView report={report} onReset={() => { setState("idle"); setReport(null); setReportId(null); }} />;
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-destructive">{errorMsg}</p>
        <Button onClick={() => setState("answering")}>重新开始</Button>
      </div>
    );
  }

  // 问卷状态（answering / submitting / generating）
  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <ProgressBar currentStep={currentStep} totalSteps={7} />
      <QuestionnaireCard
        question={QUESTIONS[currentStep]}
        value={answers[QUESTIONS[currentStep].id]}
        onAnswer={(v) => handleAnswer(QUESTIONS[currentStep].id, v)}
        onNext={() => {
          if (currentStep < 6) {
            setCurrentStep((s) => s + 1);
          } else {
            handleSubmit();
          }
        }}
        onPrev={() => setCurrentStep((s) => Math.max(0, s - 1))}
        isLast={currentStep === 6}
        isSubmitting={state === "submitting"}
      />
    </div>
  );
}
```

**注意：** 上述代码为简化版骨架。实际实现需要：
- 补充 Q4-Q7 的完整问题定义
- 实现流式生成的 EventSource 或 ReadableStream 消费逻辑
- 实现 ReportView 组件
- 实现进度条里程碑文案
- Q3→Q4 之间插入缓冲文案

- [ ] **步骤 2：Commit**

```bash
git add app/(main)/discover/page.tsx
git commit -m "feat(pages): add discover page with questionnaire SPA"
```

---

## 任务 7：组件实现

**文件：**
- 创建：`components/discover/questionnaire-card.tsx`
- 创建：`components/discover/progress-bar.tsx`
- 创建：`components/discover/report-view.tsx`

- [ ] **步骤 1：创建 components/discover/questionnaire-card.tsx**

单题卡片组件，包含：
- 问题文本展示
- 选项渲染（single/multi/textarea/scale）
- Q3→Q4 缓冲文案插入逻辑
- 选中状态视觉反馈

- [ ] **步骤 2：创建 components/discover/progress-bar.tsx**

进度条组件：
- 当前进度（已完成 ■ 和未完成 □）
- 里程碑文案（不是数字，而是"你已经发现了你的动力来源"）
- 过渡动画

- [ ] **步骤 3：创建 components/discover/report-view.tsx**

报告展示组件，包含：
- 可迁移技能列表
- 职业道路卡片（含行业/薪资/搜索策略）
- 快速起步步骤
- 现实检验
- "重新探索"按钮
- 加载状态（流式输出时的渐进展示）

- [ ] **步骤 4：Commit**

```bash
git add components/discover/questionnaire-card.tsx components/discover/progress-bar.tsx components/discover/report-view.tsx
git commit -m "feat(components): add discover page UI components"
```

---

## 任务 8：Dashboard 引导卡片 + 侧边栏导航

**文件：**
- 创建：`components/discover/dashboard-widget.tsx`
- 修改：`components/layout/sidebar.tsx`
- 修改：`app/(main)/dashboard/page.tsx`（嵌入引导卡片）

- [ ] **步骤 1：创建 components/discover/dashboard-widget.tsx**

Dashboard 引导卡片：
- 从 `/api/strength/reports?limit=1` 获取最新报告
- 无报告时：显示引导文案 + "发现你的职业可能性"按钮 → 跳转 `/discover`
- 有报告时：显示摘要 + "重新探索"按钮

- [ ] **步骤 2：修改 components/layout/sidebar.tsx**

在 `navItems` 数组中新增：

```typescript
{ href: "/discover", icon: Compass, key: "discover" },
```

**注意：** Compass 图标需从 lucide-react 导入。

- [ ] **步骤 3：修改 app/(main)/dashboard/page.tsx**

在 Dashboard 页面中引入并渲染 `<DashboardWidget />`：
- 放在快捷操作下方或统计卡片之间

- [ ] **步骤 4：修复 /jd/input 链接错误**

在 `quickActions` 中将 `{ href: "/jd/input" ...}` 改为 `{ href: "/jd/new" ...}`（P0 缺陷修复）

- [ ] **步骤 5：Commit**

```bash
git add components/discover/dashboard-widget.tsx components/layout/sidebar.tsx app/(main)/dashboard/page.tsx
git commit -m "feat(dashboard): add discover widget and navigation"
```

---

## 任务 9：流式生成 API（含事件流）

**文件：**
- 修改：`app/api/strength/reports/[id]/route.ts`（新增流式生成端点）
- 修改：`app/api/strength/reports/route.ts`（POST 后触发异步生成）

- [ ] **步骤 1：实现流式生成逻辑**

POST `/api/strength/reports` 创建记录后，需要触发异步流式生成。
两种方案：

**方案 A（推荐）：后端轮询更新 + 前端 SSE**
POST 返回后，后端立即调用 DeepSeek，生成过程中更新数据库；
前端使用 `setInterval` 每 2 秒轮询 `GET /api/strength/reports/:id`，直到 status 变为 `completed`。

**方案 B：原生 ReadableStream + SSE**
使用 Next.js App Router 的 Response with ReadableStream，直接流式代理 DeepSeek 的 SSE 输出。

建议先实现方案 A（简单稳定），后续可升级方案 B。

**方案 A 具体实现：**
```typescript
// POST handler 中，创建记录后，触发后台生成
import { generateStrengthReport } from "@/lib/ai/prompts/strength-analyze";

// 在 POST handler 末尾：
// 触发异步生成（不等待完成）
generateStrengthReport(data.id).catch(console.error);
return successResponse({ id: data.id, status: "in_progress" }, 201);

// 新增生成函数（后台运行）
async function generateStrengthReport(reportId: string) {
  const report = await getStrengthReportById(reportId, "");
  if (!report) return;
  const messages = buildStrengthAnalyzeMessages(report.answers);
  const res = await callDeepSeekStream(messages, async (chunk) => {
    // 逐步更新数据库中的 report 字段
    await partialUpdateReport(reportId, chunk);
  });
  await updateStrengthReportStatus(reportId, "", "completed");
}
```

- [ ] **步骤 2：Commit**

```bash
git add app/api/strength/reports/route.ts app/api/strength/reports/[id]/route.ts
git commit -m "feat(api): add async strength report generation with polling"
```

---

## 规格覆盖度自检

| 规格章节 | 对应任务 |
|---------|---------|
| URL 架构（/discover SPA） | 任务 6 |
| 问卷 7 问题 | 任务 6 |
| 数据结构（strength_reports） | 任务 1, 2 |
| API CRUD | 任务 3, 4, 9 |
| 流式生成 | 任务 5, 9 |
| Dashboard 引导卡片 | 任务 8 |
| 侧边栏 Tab | 任务 8 |
| 里程碑文案 | 任务 7（progress-bar）|
| Q3→Q4 缓冲文案 | 任务 6 |
| localStorage 暂存 | 任务 6 |
| 错误处理 | 任务 6 |

**所有规格章节均有对应任务实现。无遗漏。**