# JD 匹配与定制简历（阶段 3）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现用户粘贴 JD → AI 解析提取关键词 → 基于标准版简历生成 JD 定制版简历（含匹配度分析、防幻觉待确认项机制）的完整链路。

**架构：** 沿用阶段 1-2 的 Next.js 14 App Router + CloudBase + DeepSeek 架构。新增 `jds` 集合存储 JD 记录，复用 `resumes` 集合的 `tailored` 类型存储定制简历。新增"待确认项"机制：AI 在生成定制简历时识别需要用户确认的推断内容，用户逐项确认后才落地为最终版本。

**技术栈：** Next.js 14 / TypeScript / CloudBase Node SDK / DeepSeek API / zod / shadcn/ui / Tailwind / next-intl

---

## 文件结构

### 类型定义
- 创建：`types/jd.ts` — JD 相关类型（Jd、JdSkill、ConfirmableItem、MatchAnalysis 等）

### 数据访问层
- 创建：`lib/cloudbase/jds.ts` — JD 集合的 CRUD

### AI 提示词
- 修改：`lib/ai/prompts/resume-tailor.ts` — 新增 `confirmableItems` 字段
- 创建：`lib/ai/prompts/shared/confirmable-items.ts` — 待确认项机制规则

### API 路由
- 创建：`app/api/jds/route.ts` — GET 列表 / POST 创建
- 创建：`app/api/jds/[id]/route.ts` — GET 详情 / PATCH 更新 / DELETE 删除
- 创建：`app/api/jds/parse/route.ts` — POST 解析 JD
- 创建：`app/api/jds/[id]/tailor/route.ts` — POST 生成定制简历
- 创建：`app/api/resumes/[id]/confirm/route.ts` — POST 处理待确认项

### 页面
- 修改：`app/(main)/jd/page.tsx` — JD 列表页
- 创建：`app/(main)/jd/new/page.tsx` — JD 输入页
- 创建：`app/(main)/jd/[id]/page.tsx` — JD 详情页
- 创建：`app/(main)/jd/[id]/tailor/page.tsx` — 定制简历配置页
- 创建：`app/(main)/resume/[id]/confirm/page.tsx` — 待确认项审核页
- 修改：`app/(main)/resume/[id]/page.tsx` — standard 简历详情页增加"定制简历"入口

### 测试
- 修改：`lib/ai/prompts/__tests__/prompts.test.ts`
- 创建：`lib/cloudbase/__tests__/jds.test.ts`
- 创建：`lib/ai/prompts/__tests__/confirmable-items.test.ts`

---

## 任务 1：JD 类型定义

**文件：** 创建 `types/jd.ts`

- [ ] **步骤 1：创建类型定义文件**

```typescript
// types/jd.ts
export type JdStatus = "draft" | "parsed" | "archived";

export interface JdSkill {
  name: string;
  weight: number; // 1-5
  context: string;
}

export interface JdStructured {
  title: string;
  company?: string;
  location?: string;
  employmentType: string;
  experienceLevel: string;
  hardSkills: JdSkill[];
  softSkills: JdSkill[];
  industryTerms: JdSkill[];
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

export interface Jd {
  _id: string;
  userId: string;
  rawText: string;
  structured: JdStructured;
  targetRole?: string;
  status: JdStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface JdListItem {
  _id: string;
  status: JdStatus;
  targetRole?: string;
  structuredTitle: string;
  structuredCompany?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 待确认项（AI 推断内容需用户审核） */
export interface ConfirmableItem {
  id: string;
  field: string;
  type: "inference" | "placeholder" | "quantification" | "keyword_align";
  originalText: string;
  inferredText: string;
  question: string;
  options: string[];
  status: "pending" | "accepted" | "rejected" | "modified";
  userModifiedText?: string;
}

/** 定制简历的匹配度分析 */
export interface MatchAnalysis {
  matchScore: number; // 0-100
  matchDetails: Array<{
    skill: string;
    status: "matched" | "missing" | "partial";
    weight: number;
    evidence: string;
  }>;
  gapAnalysis: string;
}
```

- [ ] **步骤 2：验证类型编译通过**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add types/jd.ts
git commit -m "feat(types): 新增 JD 与待确认项类型定义"
```

---

## 任务 2：JD 数据访问层

**文件：** 创建 `lib/cloudbase/jds.ts`、`lib/cloudbase/__tests__/jds.test.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// lib/cloudbase/__tests__/jds.test.ts
import { createJd, getJdById, listJdsByUser, updateJd, deleteJd } from "../jds";
import type { JdStructured } from "@/types/jd";

jest.mock("../db", () => ({
  Collections: { JDS: "jds", RESUMES: "resumes", USERS: "users" },
  insertOne: jest.fn(),
  findOne: jest.fn(),
  findMany: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
}));

const mockStructured: JdStructured = {
  title: "前端工程师",
  company: "测试公司",
  location: "北京",
  employmentType: "全职",
  experienceLevel: "中级",
  hardSkills: [{ name: "React", weight: 5, context: "必须精通" }],
  softSkills: [],
  industryTerms: [],
  responsibilities: ["负责前端开发"],
  requirements: ["3 年经验"],
  niceToHave: [],
};

describe("JD 数据访问层", () => {
  beforeEach(() => jest.clearAllMocks());

  it("createJd 应调用 insertOne 并返回完整 Jd 对象", async () => {
    const { insertOne } = require("../db");
    insertOne.mockResolvedValue("jd_id_123");
    const result = await createJd({
      userId: "user_1",
      rawText: "JD 原文",
      structured: mockStructured,
      targetRole: "前端",
    });
    expect(insertOne).toHaveBeenCalledWith("jds", expect.objectContaining({
      userId: "user_1",
      rawText: "JD 原文",
      structured: mockStructured,
      targetRole: "前端",
      status: "draft",
    }));
    expect(result._id).toBe("jd_id_123");
  });

  it("getJdById 应返回属于该用户的 JD", async () => {
    const { findOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "user_1", rawText: "text",
      structured: mockStructured, status: "parsed",
      createdAt: new Date(), updatedAt: new Date(),
    });
    const result = await getJdById("jd_1", "user_1");
    expect(result?._id).toBe("jd_1");
  });

  it("getJdById 应拒绝其他用户的 JD", async () => {
    const { findOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "other_user", rawText: "text",
      structured: mockStructured, status: "parsed",
      createdAt: new Date(), updatedAt: new Date(),
    });
    const result = await getJdById("jd_1", "user_1");
    expect(result).toBeNull();
  });

  it("listJdsByUser 应返回列表项含 structuredTitle", async () => {
    const { findMany } = require("../db");
    findMany.mockResolvedValue([{
      _id: "jd_1", userId: "user_1", status: "parsed",
      structured: mockStructured, targetRole: "前端",
      createdAt: new Date(), updatedAt: new Date(),
    }]);
    const result = await listJdsByUser("user_1");
    expect(result).toHaveLength(1);
    expect(result[0].structuredTitle).toBe("前端工程师");
    expect(result[0].structuredCompany).toBe("测试公司");
  });

  it("updateJd 应校验所有权后更新", async () => {
    const { findOne, updateOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "user_1", rawText: "old",
      structured: mockStructured, status: "draft",
      createdAt: new Date(), updatedAt: new Date(),
    });
    await updateJd("jd_1", "user_1", { status: "parsed" });
    expect(updateOne).toHaveBeenCalledWith("jds", "jd_1", { status: "parsed" });
  });

  it("updateJd 应拒绝不存在的 JD", async () => {
    const { findOne } = require("../db");
    findOne.mockResolvedValue(null);
    await expect(updateJd("jd_1", "user_1", { status: "parsed" }))
      .rejects.toThrow("JD 不存在或无权访问");
  });

  it("deleteJd 应校验所有权后删除", async () => {
    const { findOne, deleteOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "user_1", rawText: "text",
      structured: mockStructured, status: "parsed",
      createdAt: new Date(), updatedAt: new Date(),
    });
    await deleteJd("jd_1", "user_1");
    expect(deleteOne).toHaveBeenCalledWith("jds", "jd_1");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx jest lib/cloudbase/__tests__/jds.test.ts`
预期：FAIL，报错 "Cannot find module '../jds'"

- [ ] **步骤 3：实现 JD 数据访问层**

```typescript
// lib/cloudbase/jds.ts
import { Collections, insertOne, findOne, findMany, updateOne, deleteOne } from "./db";
import type { Jd, JdListItem, JdStructured, JdStatus } from "@/types/jd";

export interface CreateJdInput {
  userId: string;
  rawText: string;
  structured: JdStructured;
  targetRole?: string;
  status?: JdStatus;
}

export async function createJd(input: CreateJdInput): Promise<Jd> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    rawText: input.rawText,
    structured: input.structured,
    targetRole: input.targetRole,
    status: input.status ?? ("draft" as JdStatus),
    createdAt: now,
    updatedAt: now,
  };
  const id = await insertOne(Collections.JDS, doc);
  return { _id: id, ...doc } as Jd;
}

export async function getJdById(id: string, userId: string): Promise<Jd | null> {
  const jd = await findOne<Jd>(Collections.JDS, { _id: id });
  if (!jd || jd.userId !== userId) return null;
  return jd;
}

export async function listJdsByUser(
  userId: string,
  options?: { status?: JdStatus; limit?: number },
): Promise<JdListItem[]> {
  const query: Record<string, unknown> = { userId };
  if (options?.status) query.status = options.status;
  const jds = await findMany<Jd>(Collections.JDS, query, {
    orderBy: { field: "updatedAt", direction: "desc" },
    limit: options?.limit ?? 50,
  });
  return jds.map((j) => ({
    _id: j._id,
    status: j.status,
    targetRole: j.targetRole,
    structuredTitle: j.structured.title,
    structuredCompany: j.structured.company,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));
}

export interface UpdateJdInput {
  rawText?: string;
  structured?: JdStructured;
  targetRole?: string;
  status?: JdStatus;
}

export async function updateJd(
  id: string, userId: string, update: UpdateJdInput,
): Promise<void> {
  const existing = await getJdById(id, userId);
  if (!existing) throw new Error("JD 不存在或无权访问");
  await updateOne(Collections.JDS, id, update as Record<string, unknown>);
}

export async function deleteJd(id: string, userId: string): Promise<void> {
  const existing = await getJdById(id, userId);
  if (!existing) throw new Error("JD 不存在或无权访问");
  await deleteOne(Collections.JDS, id);
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx jest lib/cloudbase/__tests__/jds.test.ts`
预期：PASS（7 个测试通过）

- [ ] **步骤 5：Commit**

```bash
git add lib/cloudbase/jds.ts lib/cloudbase/__tests__/jds.test.ts
git commit -m "feat(cloudbase): 新增 JD 数据访问层及测试"
```

---

## 任务 3：待确认项机制规则

**文件：** 创建 `lib/ai/prompts/shared/confirmable-items.ts`、`lib/ai/prompts/__tests__/confirmable-items.test.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// lib/ai/prompts/__tests__/confirmable-items.test.ts
import {
  CONFIRMABLE_ITEMS_PROMPT_FRAGMENT,
  createConfirmableItem,
  filterPendingItems,
  isConfirmCompleted,
} from "../shared/confirmable-items";
import type { ConfirmableItem } from "@/types/jd";

describe("待确认项机制", () => {
  it("提示词片段应包含 4 种类型说明", () => {
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("inference");
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("placeholder");
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("quantification");
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("keyword_align");
  });

  it("提示词片段应包含输出格式示例", () => {
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain('"confirmableItems"');
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain('"question"');
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain('"options"');
  });

  it("createConfirmableItem 应生成带 id 的 pending 条目", () => {
    const item = createConfirmableItem({
      field: "experiences[0].bullets[1]",
      type: "inference",
      originalText: "参与了项目",
      inferredText: "主导了项目",
      question: "原文是'参与'，是否升级为'主导'？",
      options: ["接受推断", "保留原文", "自定义"],
    });
    expect(item.id).toBeTruthy();
    expect(item.status).toBe("pending");
    expect(item.type).toBe("inference");
  });

  it("filterPendingItems 应只返回 pending 状态", () => {
    const items: ConfirmableItem[] = [
      { id: "1", field: "a", type: "inference", originalText: "a", inferredText: "b", question: "q", options: [], status: "pending" },
      { id: "2", field: "b", type: "placeholder", originalText: "a", inferredText: "b", question: "q", options: [], status: "accepted" },
      { id: "3", field: "c", type: "quantification", originalText: "a", inferredText: "b", question: "q", options: [], status: "pending" },
    ];
    const pending = filterPendingItems(items);
    expect(pending).toHaveLength(2);
    expect(pending[0].id).toBe("1");
  });

  it("isConfirmCompleted 应在无 pending 项时返回 true", () => {
    const items: ConfirmableItem[] = [
      { id: "1", field: "a", type: "inference", originalText: "a", inferredText: "b", question: "q", options: [], status: "accepted" },
      { id: "2", field: "b", type: "placeholder", originalText: "a", inferredText: "b", question: "q", options: [], status: "rejected" },
    ];
    expect(isConfirmCompleted(items)).toBe(true);
  });

  it("isConfirmCompleted 应在有 pending 项时返回 false", () => {
    const items: ConfirmableItem[] = [
      { id: "1", field: "a", type: "inference", originalText: "a", inferredText: "b", question: "q", options: [], status: "pending" },
    ];
    expect(isConfirmCompleted(items)).toBe(false);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx jest lib/ai/prompts/__tests__/confirmable-items.test.ts`
预期：FAIL，报错 "Cannot find module '../shared/confirmable-items'"

- [ ] **步骤 3：实现待确认项机制**

```typescript
// lib/ai/prompts/shared/confirmable-items.ts
import type { ConfirmableItem } from "@/types/jd";

export const CONFIRMABLE_TYPES = [
  "inference",
  "placeholder",
  "quantification",
  "keyword_align",
] as const;

export const CONFIRMABLE_ITEMS_PROMPT_FRAGMENT = `
# 待确认项机制（Confirmable Items）

在生成定制简历时，对于任何 AI 推断、占位符、量化添加、关键词对齐的内容，必须生成待确认项，让用户逐项确认。

## 4 种待确认类型
1. inference: AI 推断（如将"参与了项目"升级为"主导了项目"）
2. placeholder: 占位符（如 \`____%\` 需用户填写具体数字）
3. quantification: 量化添加（原文无数值但 AI 添加了数字）
4. keyword_align: 关键词对齐（如"前端开发"→"Web 前端开发"）

## 输出格式
在 JSON 输出中新增 \`confirmableItems\` 数组：
\`\`\`json
{
  "confirmableItems": [
    {
      "field": "experiences[0].bullets[1]",
      "type": "inference",
      "originalText": "参与了项目开发",
      "inferredText": "主导了项目开发",
      "question": "原文是'参与了项目开发'，是否升级为'主导了项目开发'？",
      "options": ["接受推断", "保留原文", "自定义"]
    }
  ]
}
\`\`\`

## 规则
- 每条非 low 风险的改写必须生成对应的 confirmableItem
- placeholder 类型必须有明确的占位符位置
- question 必须清晰说明原文与推断的差异
- options 至少包含 "接受推断"、"保留原文"、"自定义" 三个选项
- 不可为 low 风险的格式修正生成待确认项
`.trim();

export function createConfirmableItem(input: {
  field: string;
  type: (typeof CONFIRMABLE_TYPES)[number];
  originalText: string;
  inferredText: string;
  question: string;
  options: string[];
}): ConfirmableItem {
  return {
    id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    field: input.field,
    type: input.type,
    originalText: input.originalText,
    inferredText: input.inferredText,
    question: input.question,
    options: input.options,
    status: "pending",
  };
}

export function filterPendingItems(items: ConfirmableItem[]): ConfirmableItem[] {
  return items.filter((item) => item.status === "pending");
}

export function isConfirmCompleted(items: ConfirmableItem[]): boolean {
  return items.every((item) => item.status !== "pending");
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx jest lib/ai/prompts/__tests__/confirmable-items.test.ts`
预期：PASS（5 个测试通过）

- [ ] **步骤 5：Commit**

```bash
git add lib/ai/prompts/shared/confirmable-items.ts lib/ai/prompts/__tests__/confirmable-items.test.ts
git commit -m "feat(prompts): 新增待确认项机制规则及测试"
```

---

## 任务 4：更新 resume-tailor 提示词

**文件：** 修改 `lib/ai/prompts/resume-tailor.ts`、`lib/ai/prompts/__tests__/prompts.test.ts`

- [ ] **步骤 1：编写失败的测试**

在 `lib/ai/prompts/__tests__/prompts.test.ts` 文件末尾追加：

```typescript
describe("resume-tailor 提示词（含待确认项）", () => {
  it("系统提示词应包含待确认项机制说明", () => {
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("待确认项");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("confirmableItems");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("inference");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("placeholder");
  });

  it("parseResumeTailorResult 应解析 confirmableItems 字段", () => {
    const mockResponse = JSON.stringify({
      content: { zh: "中文简历", en: "English resume" },
      provenance: [],
      matchAnalysis: { matchScore: 80, matchDetails: [], gapAnalysis: "无差距" },
      aiFlavorScore: 0,
      confirmableItems: [{
        field: "experiences[0].bullets[0]",
        type: "inference",
        originalText: "参与了项目",
        inferredText: "主导了项目",
        question: "是否升级动词？",
        options: ["接受推断", "保留原文", "自定义"],
      }],
    });
    const result = parseResumeTailorResult(mockResponse);
    expect(result.confirmableItems).toHaveLength(1);
    expect(result.confirmableItems[0].type).toBe("inference");
    expect(result.confirmableItems[0].status).toBe("pending");
  });

  it("parseResumeTailorResult 应在缺少 confirmableItems 时返回空数组", () => {
    const mockResponse = JSON.stringify({
      content: { zh: "中文", en: "English" },
      provenance: [],
      matchAnalysis: { matchScore: 70, matchDetails: [], gapAnalysis: "" },
      aiFlavorScore: 0,
    });
    const result = parseResumeTailorResult(mockResponse);
    expect(result.confirmableItems).toEqual([]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx jest lib/ai/prompts/__tests__/prompts.test.ts -t "resume-tailor 提示词（含待确认项）"`
预期：FAIL

- [ ] **步骤 3：更新 resume-tailor.ts**

修改 `lib/ai/prompts/resume-tailor.ts`：

1. 顶部 import 区新增：
```typescript
import { CONFIRMABLE_ITEMS_PROMPT_FRAGMENT } from "./shared/confirmable-items";
import type { ConfirmableItem } from "@/types/jd";
```

2. 在 `RESUME_TAILOR_SYSTEM_PROMPT` 中，将：
```typescript
${PROVENANCE_PROMPT_FRAGMENT}

## 禁止行为
```
改为：
```typescript
${PROVENANCE_PROMPT_FRAGMENT}

${CONFIRMABLE_ITEMS_PROMPT_FRAGMENT}

## 禁止行为
```

3. 在 JSON 输出格式示例中，将 `"aiFlavorScore": 0\n}` 改为：
```json
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
```

4. 在 `ResumeTailorResult` 接口末尾新增：
```typescript
  confirmableItems: ConfirmableItem[];
```

5. 在 `parseResumeTailorResult` 的 return 对象末尾新增：
```typescript
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
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx jest lib/ai/prompts/__tests__/prompts.test.ts -t "resume-tailor 提示词（含待确认项）"`
预期：PASS（3 个测试通过）

- [ ] **步骤 5：运行全部测试确认无回归**

运行：`npx jest`
预期：所有测试通过

- [ ] **步骤 6：Commit**

```bash
git add lib/ai/prompts/resume-tailor.ts lib/ai/prompts/__tests__/prompts.test.ts
git commit -m "feat(prompts): resume-tailor 新增待确认项机制"
```

---

## 任务 5：JD 创建与列表 API

**文件：** 创建 `app/api/jds/route.ts`

- [ ] **步骤 1：实现 JD 列表与创建 API**

```typescript
// app/api/jds/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { listJdsByUser, createJd } from "@/lib/cloudbase/jds";
import {
  successResponse, unauthorizedResponse, internalErrorResponse, validationErrorResponse,
} from "@/lib/utils/response";
import type { JdStatus } from "@/types/jd";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  rawText: z.string().min(1, "JD 原文不可为空").max(20000, "JD 原文过长"),
  structured: z.object({
    title: z.string(),
    company: z.string().optional(),
    location: z.string().optional(),
    employmentType: z.string(),
    experienceLevel: z.string(),
    hardSkills: z.array(z.object({
      name: z.string(), weight: z.number(), context: z.string(),
    })).default([]),
    softSkills: z.array(z.object({
      name: z.string(), weight: z.number(), context: z.string(),
    })).default([]),
    industryTerms: z.array(z.object({
      name: z.string(), weight: z.number(), context: z.string(),
    })).default([]),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    niceToHave: z.array(z.string()).default([]),
  }),
  targetRole: z.string().optional(),
  status: z.enum(["draft", "parsed", "archived"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as JdStatus | null;
    const limitParam = searchParams.get("limit");

    const validStatuses: JdStatus[] = ["draft", "parsed", "archived"];
    if (status && !validStatuses.includes(status)) {
      return validationErrorResponse(`无效的 status 参数: ${status}`);
    }

    let limit: number | undefined;
    if (limitParam) {
      const parsed = Number.parseInt(limitParam, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
        return validationErrorResponse("limit 参数应为 1-100 之间的整数");
      }
      limit = parsed;
    }

    const jds = await listJdsByUser(session.userId, { status: status ?? undefined, limit });
    return successResponse({ jds });
  } catch (error) {
    console.error("获取 JD 列表失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return internalErrorResponse(`获取 JD 列表失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse("输入校验失败", parsed.error.flatten());

    const data = parsed.data;
    const jd = await createJd({
      userId: session.userId,
      rawText: data.rawText,
      structured: data.structured,
      targetRole: data.targetRole,
      status: data.status,
    });
    return successResponse(jd, 201);
  } catch (error) {
    console.error("创建 JD 失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return internalErrorResponse(`创建 JD 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add app/api/jds/route.ts
git commit -m "feat(api): JD 创建与列表 API"
```

---

## 任务 6：JD 详情、更新、删除 API

**文件：** 创建 `app/api/jds/[id]/route.ts`

- [ ] **步骤 1：实现 JD 详情、更新、删除 API**

```typescript
// app/api/jds/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getJdById, updateJd, deleteJd } from "@/lib/cloudbase/jds";
import {
  successResponse, unauthorizedResponse, internalErrorResponse,
  validationErrorResponse, errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  rawText: z.string().min(1).max(20000).optional(),
  structured: z.object({
    title: z.string(),
    company: z.string().optional(),
    location: z.string().optional(),
    employmentType: z.string(),
    experienceLevel: z.string(),
    hardSkills: z.array(z.object({
      name: z.string(), weight: z.number(), context: z.string(),
    })).default([]),
    softSkills: z.array(z.object({
      name: z.string(), weight: z.number(), context: z.string(),
    })).default([]),
    industryTerms: z.array(z.object({
      name: z.string(), weight: z.number(), context: z.string(),
    })).default([]),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    niceToHave: z.array(z.string()).default([]),
  }).optional(),
  targetRole: z.string().optional(),
  status: z.enum(["draft", "parsed", "archived"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const jd = await getJdById(params.id, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "JD 不存在或无权访问", 404);
    return successResponse(jd);
  } catch (error) {
    console.error("获取 JD 详情失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return internalErrorResponse(`获取 JD 详情失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse("输入校验失败", parsed.error.flatten());

    await updateJd(params.id, session.userId, parsed.data);
    const updated = await getJdById(params.id, session.userId);
    return successResponse(updated);
  } catch (error) {
    console.error("更新 JD 失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message.includes("不存在")) return errorResponse("NOT_FOUND", error.message, 404);
    return internalErrorResponse(`更新 JD 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    await deleteJd(params.id, session.userId);
    return successResponse({ deleted: true });
  } catch (error) {
    console.error("删除 JD 失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message.includes("不存在")) return errorResponse("NOT_FOUND", error.message, 404);
    return internalErrorResponse(`删除 JD 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/api/jds/[id]/route.ts"
git commit -m "feat(api): JD 详情、更新、删除 API"
```

---

## 任务 7：JD 解析 API

**文件：** 创建 `app/api/jds/parse/route.ts`

- [ ] **步骤 1：实现 JD 解析 API**

```typescript
// app/api/jds/parse/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import { buildJdParseMessages, parseJdParseResult } from "@/lib/ai/prompts/jd-parse";
import {
  successResponse, unauthorizedResponse, internalErrorResponse,
  validationErrorResponse, errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const parseSchema = z.object({
  jdText: z.string().min(10, "JD 文本过短（至少 10 字符）").max(20000, "JD 文本过长"),
  targetRole: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = parseSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse("输入校验失败", parsed.error.flatten());

    const { jdText, targetRole } = parsed.data;
    const messages = buildJdParseMessages({ jdText, targetRole });
    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.3,
      maxTokens: 4096,
      responseFormat: "json_object",
    });
    const structured = parseJdParseResult(aiResponse.content);
    return successResponse({ structured, usage: aiResponse.usage });
  } catch (error) {
    console.error("JD 解析失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message.includes("解析失败")) return errorResponse("AI_PARSE_ERROR", error.message, 502);
    return internalErrorResponse(`JD 解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add app/api/jds/parse/route.ts
git commit -m "feat(api): JD 解析 API（调用 DeepSeek）"
```

---

## 任务 8：简历定制 API（含待确认项）

**文件：** 创建 `app/api/jds/[id]/tailor/route.ts`，修改 `types/resume.ts`、`lib/cloudbase/resumes.ts`

- [ ] **步骤 1：扩展 Resume 类型**

修改 `types/resume.ts`，在顶部 import 区新增：
```typescript
import type { MatchAnalysis, ConfirmableItem } from "./jd";
```

在 `Resume` 接口中，在 `aiFlavorScore?: number;` 之后新增：
```typescript
  // tailored 简历扩展字段
  jdId?: string;
  matchAnalysis?: MatchAnalysis;
  confirmableItems?: ConfirmableItem[];
  confirmCompleted?: boolean;
```

- [ ] **步骤 2：扩展 resumes 数据访问层**

修改 `lib/cloudbase/resumes.ts` 的 `UpdateResumeInput` 接口，在末尾新增：
```typescript
  // tailored 扩展字段
  jdId?: string;
  matchAnalysis?: import("@/types/jd").MatchAnalysis;
  confirmableItems?: import("@/types/jd").ConfirmableItem[];
  confirmCompleted?: boolean;
```

- [ ] **步骤 3：实现简历定制 API**

```typescript
// app/api/jds/[id]/tailor/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getJdById } from "@/lib/cloudbase/jds";
import { getResumeById, createResume, updateResume } from "@/lib/cloudbase/resumes";
import { callDeepSeekWithRetry } from "@/lib/ai/deepseek";
import { buildResumeTailorMessages, parseResumeTailorResult } from "@/lib/ai/prompts/resume-tailor";
import { detectAiFlavor } from "@/lib/ai/prompts/shared/ai-flavor-check";
import { countPlaceholders } from "@/lib/utils/markdown";
import {
  successResponse, validationErrorResponse, unauthorizedResponse,
  internalErrorResponse, errorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

const tailorSchema = z.object({
  standardResumeId: z.string().min(1, "standardResumeId 不可为空"),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = tailorSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse("输入校验失败", parsed.error.flatten());

    const { standardResumeId } = parsed.data;

    const jd = await getJdById(params.id, session.userId);
    if (!jd) return errorResponse("NOT_FOUND", "JD 不存在或无权访问", 404);

    const standard = await getResumeById(standardResumeId, session.userId);
    if (!standard) return errorResponse("NOT_FOUND", "标准版简历不存在或无权访问", 404);
    if (standard.type !== "standard") {
      return validationErrorResponse(`仅支持从标准版简历生成定制版，当前简历类型: ${standard.type}`);
    }
    if (!standard.content) {
      return validationErrorResponse("标准版简历尚未生成内容，请先生成标准版");
    }

    const messages = buildResumeTailorMessages({
      standardContent: standard.content,
      structured: standard.structured,
      jdText: jd.rawText,
      targetRole: jd.targetRole,
    });

    const aiResponse = await callDeepSeekWithRetry(messages, {
      temperature: 0.5,
      maxTokens: 8192,
      responseFormat: "json_object",
    });

    const result = parseResumeTailorResult(aiResponse.content);

    const zhFlavor = detectAiFlavor(result.content.zh);
    const enFlavor = detectAiFlavor(result.content.en);
    const aiFlavorScore = zhFlavor.hits.total + enFlavor.hits.total;
    const zhPlaceholders = countPlaceholders(result.content.zh);
    const enPlaceholders = countPlaceholders(result.content.en);

    const tailoredResume = await createResume({
      userId: session.userId,
      type: "tailored",
      sourceType: standard.sourceType,
      sourceFileId: standard.sourceFileId,
      rawContent: standard.rawContent,
      structured: standard.structured,
      targetRole: jd.targetRole,
      parentId: standardResumeId,
      status: "draft",
    });

    await updateResume(tailoredResume._id, session.userId, {
      content: result.content,
      provenance: result.provenance,
      aiFlavorScore,
      jdId: params.id,
      matchAnalysis: result.matchAnalysis,
      confirmableItems: result.confirmableItems,
      confirmCompleted: result.confirmableItems.length === 0,
    });

    return successResponse({
      resumeId: tailoredResume._id,
      content: result.content,
      provenance: result.provenance,
      matchAnalysis: result.matchAnalysis,
      confirmableItems: result.confirmableItems,
      aiFlavorScore,
      aiFlavorPassed: zhFlavor.passed && enFlavor.passed,
      placeholderCount: { zh: zhPlaceholders, en: enPlaceholders, total: zhPlaceholders + enPlaceholders },
      usage: aiResponse.usage,
    });
  } catch (error) {
    console.error("生成定制简历失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error instanceof Error && error.message.includes("解析失败")) return errorResponse("AI_PARSE_ERROR", error.message, 502);
    return internalErrorResponse(`生成定制简历失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **步骤 4：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 5：Commit**

```bash
git add "app/api/jds/[id]/tailor/route.ts" types/resume.ts lib/cloudbase/resumes.ts
git commit -m "feat(api): 简历定制 API（含待确认项与匹配度分析）"
```

---

## 任务 9：待确认项处理 API

**文件：** 创建 `app/api/resumes/[id]/confirm/route.ts`

- [ ] **步骤 1：实现待确认项处理 API**

```typescript
// app/api/resumes/[id]/confirm/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/cloudbase/auth";
import { getResumeById, updateResume } from "@/lib/cloudbase/resumes";
import { isConfirmCompleted } from "@/lib/ai/prompts/shared/confirmable-items";
import {
  successResponse, validationErrorResponse, unauthorizedResponse,
  internalErrorResponse, errorResponse,
} from "@/lib/utils/response";
import type { ConfirmableItem } from "@/types/jd";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    status: z.enum(["accepted", "rejected", "modified"]),
    userModifiedText: z.string().optional(),
  })),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse("输入校验失败", parsed.error.flatten());

    const resume = await getResumeById(params.id, session.userId);
    if (!resume) return errorResponse("NOT_FOUND", "简历不存在或无权访问", 404);
    if (resume.type !== "tailored") return validationErrorResponse("仅定制版简历支持待确认项处理");
    if (!resume.confirmableItems || resume.confirmableItems.length === 0) {
      return validationErrorResponse("该简历无待确认项");
    }

    const userConfirmations = new Map(parsed.data.items.map((item) => [item.id, item]));
    const updatedItems: ConfirmableItem[] = resume.confirmableItems.map((item) => {
      const userResp = userConfirmations.get(item.id);
      if (!userResp) return item;
      return {
        ...item,
        status: userResp.status,
        userModifiedText: userResp.userModifiedText,
      };
    });

    const confirmCompleted = isConfirmCompleted(updatedItems);
    await updateResume(params.id, session.userId, {
      confirmableItems: updatedItems,
      confirmCompleted,
    });

    return successResponse({
      resumeId: params.id,
      confirmableItems: updatedItems,
      confirmCompleted,
    });
  } catch (error) {
    console.error("处理待确认项失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return internalErrorResponse(`处理待确认项失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/api/resumes/[id]/confirm/route.ts"
git commit -m "feat(api): 待确认项处理 API"
```

---

## 任务 10：JD 列表页

**文件：** 修改 `app/(main)/jd/page.tsx`

- [ ] **步骤 1：实现 JD 列表页**

```tsx
// app/(main)/jd/page.tsx
import { getCurrentUser } from "@/lib/cloudbase/auth";
import { listJdsByUser } from "@/lib/cloudbase/jds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { JdStatus } from "@/types/jd";

export const dynamic = "force-dynamic";

const statusVariants: Record<JdStatus, "default" | "secondary" | "outline" | "success" | "warning"> = {
  draft: "warning", parsed: "success", archived: "secondary",
};
const statusLabels: Record<JdStatus, string> = {
  draft: "草稿", parsed: "已解析", archived: "已归档",
};

export default async function JdListPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const jds = await listJdsByUser(session.userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">岗位 JD</h1>
          <p className="text-muted-foreground mt-1">粘贴 JD，AI 解析关键词，生成定制简历</p>
        </div>
        <Link href="/jd/new"><Button><Plus className="h-4 w-4 mr-2" />新建 JD</Button></Link>
      </div>

      {jds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有 JD，开始添加吧</p>
            <Link href="/jd/new"><Button><Plus className="h-4 w-4 mr-2" />新建 JD</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jds.map((jd) => (
            <Link key={jd._id} href={`/jd/${jd._id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{jd.structuredTitle || jd.targetRole || "未命名 JD"}</CardTitle>
                    <Badge variant={statusVariants[jd.status]}>{statusLabels[jd.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {jd.structuredCompany && <p className="text-sm text-muted-foreground">{jd.structuredCompany}</p>}
                  <p className="text-xs text-muted-foreground mt-2">更新于 {new Date(jd.updatedAt).toLocaleDateString("zh-CN")}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/(main)/jd/page.tsx"
git commit -m "feat(page): JD 列表页"
```

---

## 任务 11：JD 输入页

**文件：** 创建 `app/(main)/jd/new/page.tsx`

- [ ] **步骤 1：实现 JD 输入页**

```tsx
// app/(main)/jd/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function JdNewPage() {
  const router = useRouter();
  const [jdText, setJdText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParseAndSave = async () => {
    if (jdText.trim().length < 10) { setError("JD 文本至少需要 10 个字符"); return; }
    setLoading(true); setError(null);

    try {
      const parseResponse = await fetch("/api/jds/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, targetRole: targetRole || undefined }),
      });
      if (!parseResponse.ok) {
        const data = await parseResponse.json();
        throw new Error(data.error?.message || "解析失败");
      }
      const parseData = await parseResponse.json();
      const structured = parseData.data.structured;

      const createResponse = await fetch("/api/jds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: jdText, structured, targetRole: targetRole || undefined, status: "parsed" }),
      });
      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error?.message || "保存失败");
      }
      const createData = await createResponse.json();
      router.push(`/jd/${createData.data._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jd"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">新建 JD</h1>
          <p className="text-muted-foreground mt-1">粘贴职位描述，AI 将自动解析关键词</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>JD 内容</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetRole">目标岗位（可选）</Label>
            <Input id="targetRole" placeholder="如：高级前端工程师" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            <p className="text-xs text-muted-foreground">提供目标岗位可提升 AI 解析准确度</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jdText">职位描述 *</Label>
            <Textarea id="jdText" placeholder="粘贴完整的职位描述（JD）..." value={jdText} onChange={(e) => setJdText(e.target.value)} rows={12} className="resize-y" />
            <p className="text-xs text-muted-foreground">当前字数：{jdText.length}</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Link href="/jd"><Button variant="outline">取消</Button></Link>
            <Button onClick={handleParseAndSave} disabled={loading || jdText.trim().length < 10}>
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />解析中...</>) : (<><Sparkles className="h-4 w-4 mr-2" />解析并保存</>)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/(main)/jd/new/page.tsx"
git commit -m "feat(page): JD 输入页"
```

---

## 任务 12：JD 详情页（含匹配度可视化）

**文件：** 创建 `app/(main)/jd/[id]/page.tsx`

- [ ] **步骤 1：实现 JD 详情页**

```tsx
// app/(main)/jd/[id]/page.tsx
import { getCurrentUser } from "@/lib/cloudbase/auth";
import { getJdById, deleteJd } from "@/lib/cloudbase/jds";
import { listResumesByUser } from "@/lib/cloudbase/resumes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Trash2, Briefcase, MapPin, Building2 } from "lucide-react";
import Link from "next/link";
import { redirect, notFound, revalidatePath } from "next/navigation";
import type { JdStatus } from "@/types/jd";

export const dynamic = "force-dynamic";

const statusVariants: Record<JdStatus, "default" | "secondary" | "outline" | "success" | "warning"> = {
  draft: "warning", parsed: "success", archived: "secondary",
};
const statusLabels: Record<JdStatus, string> = { draft: "草稿", parsed: "已解析", archived: "已归档" };

function SkillWeightBadge({ weight }: { weight: number }) {
  const variant = weight >= 5 ? "danger" : weight >= 4 ? "warning" : weight >= 3 ? "default" : "secondary";
  return <Badge variant={variant as "default"}>权重 {weight}</Badge>;
}

async function handleDelete(jdId: string, userId: string) {
  "use server";
  await deleteJd(jdId, userId);
  revalidatePath("/jd");
  redirect("/jd");
}

export default async function JdDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const jd = await getJdById(params.id, session.userId);
  if (!jd) notFound();

  const standardResumes = await listResumesByUser(session.userId, { type: "standard", status: "confirmed" });
  const deleteAction = handleDelete.bind(null, params.id, session.userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jd"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{jd.structured.title}</h1>
            <Badge variant={statusVariants[jd.status]}>{statusLabels[jd.status]}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            {jd.structured.company && (<span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{jd.structured.company}</span>)}
            {jd.structured.location && (<span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{jd.structured.location}</span>)}
            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{jd.structured.employmentType} · {jd.structured.experienceLevel}</span>
          </div>
        </div>
        <form action={deleteAction}><Button type="submit" variant="outline" size="icon"><Trash2 className="h-4 w-4" /></Button></form>
      </div>

      <Card>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">生成定制简历</p>
              <p className="text-sm text-muted-foreground">基于此 JD 和你的标准版简历，生成定制化简历</p>
            </div>
          </div>
          {standardResumes.length === 0 ? (
            <p className="text-sm text-orange-600">请先创建并确认标准版简历</p>
          ) : (
            <Link href={`/jd/${jd._id}/tailor`}><Button><Sparkles className="h-4 w-4 mr-2" />生成定制简历</Button></Link>
          )}
        </CardContent>
      </Card>

      {jd.structured.hardSkills.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">硬技能要求</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jd.structured.hardSkills.map((skill, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><span className="font-medium">{skill.name}</span><span className="text-sm text-muted-foreground ml-2">{skill.context}</span></div>
                  <SkillWeightBadge weight={skill.weight} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {jd.structured.softSkills.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">软技能要求</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jd.structured.softSkills.map((skill, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><span className="font-medium">{skill.name}</span><span className="text-sm text-muted-foreground ml-2">{skill.context}</span></div>
                  <SkillWeightBadge weight={skill.weight} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {jd.structured.responsibilities.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">岗位职责</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2 list-disc list-inside text-sm">{jd.structured.responsibilities.map((item, i) => <li key={i}>{item}</li>)}</ul></CardContent>
        </Card>
      )}

      {jd.structured.requirements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">任职要求</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2 list-disc list-inside text-sm">{jd.structured.requirements.map((item, i) => <li key={i}>{item}</li>)}</ul></CardContent>
        </Card>
      )}

      {jd.structured.niceToHave.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">加分项</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2 list-disc list-inside text-sm">{jd.structured.niceToHave.map((item, i) => <li key={i}>{item}</li>)}</ul></CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/(main)/jd/[id]/page.tsx"
git commit -m "feat(page): JD 详情页（含技能权重可视化）"
```

---

## 任务 13：定制简历配置页

**文件：** 创建 `app/(main)/jd/[id]/tailor/page.tsx`

- [ ] **步骤 1：实现定制简历配置页**

```tsx
// app/(main)/jd/[id]/tailor/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Sparkles, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";

interface StandardResume {
  _id: string;
  targetRole?: string;
  updatedAt: string;
}

export default function TailorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [standardResumes, setStandardResumes] = useState<StandardResume[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const response = await fetch("/api/resumes?type=standard&status=confirmed");
        if (!response.ok) throw new Error("获取标准版简历失败");
        const data = await response.json();
        setStandardResumes(data.data.resumes || []);
        if (data.data.resumes?.length > 0) setSelectedId(data.data.resumes[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setFetching(false);
      }
    };
    fetchResumes();
  }, []);

  const handleTailor = async () => {
    if (!selectedId) { setError("请选择标准版简历"); return; }
    setLoading(true); setError(null);

    try {
      const response = await fetch(`/api/jds/${params.id}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standardResumeId: selectedId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "生成失败");
      }
      const data = await response.json();
      router.push(`/resume/${data.data.resumeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/jd/${params.id}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">生成定制简历</h1>
          <p className="text-muted-foreground mt-1">选择标准版简历，基于 JD 生成定制版</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>选择标准版简历</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {standardResumes.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">暂无已确认的标准版简历</p>
              <Link href="/resume"><Button>去创建标准版简历</Button></Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {standardResumes.map((resume) => (
                  <label key={resume._id} className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${selectedId === resume._id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <input type="radio" name="standardResume" value={resume._id} checked={selectedId === resume._id} onChange={(e) => setSelectedId(e.target.value)} className="h-4 w-4" />
                    <div className="flex-1">
                      <p className="font-medium">{resume.targetRole || "标准版简历"}</p>
                      <p className="text-xs text-muted-foreground">更新于 {new Date(resume.updatedAt).toLocaleDateString("zh-CN")}</p>
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Link href={`/jd/${params.id}`}><Button variant="outline">取消</Button></Link>
                <Button onClick={handleTailor} disabled={loading || !selectedId}>
                  {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />生成中...</>) : (<><Sparkles className="h-4 w-4 mr-2" />生成定制简历</>)}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/(main)/jd/[id]/tailor/page.tsx"
git commit -m "feat(page): 定制简历配置页"
```

---

## 任务 14：待确认项审核页

**文件：** 创建 `app/(main)/resume/[id]/confirm/page.tsx`

- [ ] **步骤 1：实现待确认项审核页**

```tsx
// app/(main)/resume/[id]/confirm/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ConfirmableItem } from "@/types/jd";

export default function ConfirmPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [items, setItems] = useState<ConfirmableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const response = await fetch(`/api/resumes/${params.id}`);
        if (!response.ok) throw new Error("加载失败");
        const data = await response.json();
        setItems(data.data.confirmableItems || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchResume();
  }, [params.id]);

  const handleItemStatus = (itemId: string, status: ConfirmableItem["status"]) => {
    setItems((prev) => prev.map((item) =>
      item.id === itemId ? { ...item, status, userModifiedText: status === "modified" ? customTexts[itemId] ?? "" : undefined } : item
    ));
  };

  const handleCustomTextChange = (itemId: string, text: string) => {
    setCustomTexts((prev) => ({ ...prev, [itemId]: text }));
  };

  const handleSubmit = async () => {
    const pendingItems = items.filter((item) => item.status === "pending");
    if (pendingItems.length > 0) { setError(`还有 ${pendingItems.length} 项未处理`); return; }

    setSubmitting(true); setError(null);
    try {
      const response = await fetch(`/api/resumes/${params.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            status: item.status,
            userModifiedText: item.userModifiedText,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "提交失败");
      }
      router.push(`/resume/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const pendingCount = items.filter((item) => item.status === "pending").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/resume/${params.id}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">待确认项审核</h1>
          <p className="text-muted-foreground mt-1">AI 在生成定制简历时做了以下推断，请逐项确认</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <p className="text-muted-foreground">该简历无待确认项</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">共 {items.length} 项，剩余 {pendingCount} 项待处理</p>
          </div>

          {items.map((item, index) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">项 {index + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.type}</Badge>
                    {item.status !== "pending" && (
                      <Badge variant={item.status === "accepted" ? "success" : item.status === "rejected" ? "secondary" : "default"}>
                        {item.status === "accepted" ? "已接受" : item.status === "rejected" ? "已拒绝" : "已修改"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">问题</p>
                  <p className="text-sm text-muted-foreground">{item.question}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium mb-1">原文</p>
                    <p className="text-sm">{item.originalText}</p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                    <p className="text-xs font-medium mb-1">AI 推断</p>
                    <p className="text-sm">{item.inferredText}</p>
                  </div>
                </div>

                {item.status === "modified" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">自定义修改</p>
                    <Textarea
                      placeholder="输入你想要的文本..."
                      value={customTexts[item.id] ?? item.userModifiedText ?? ""}
                      onChange={(e) => handleCustomTextChange(item.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant={item.status === "accepted" ? "default" : "outline"} onClick={() => handleItemStatus(item.id, "accepted")}>接受推断</Button>
                  <Button size="sm" variant={item.status === "rejected" ? "default" : "outline"} onClick={() => handleItemStatus(item.id, "rejected")}>保留原文</Button>
                  <Button size="sm" variant={item.status === "modified" ? "default" : "outline"} onClick={() => handleItemStatus(item.id, "modified")}>自定义</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Link href={`/resume/${params.id}`}><Button variant="outline">取消</Button></Link>
            <Button onClick={handleSubmit} disabled={submitting || pendingCount > 0}>
              {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />提交中...</>) : "提交确认"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/(main)/resume/[id]/confirm/page.tsx"
git commit -m "feat(page): 待确认项审核页"
```

---

## 任务 15：standard 简历详情页增加"定制简历"入口

**文件：** 修改 `app/(main)/resume/[id]/page.tsx`

- [ ] **步骤 1：在 standard 简历详情页增加定制入口**

在 `app/(main)/resume/[id]/page.tsx` 中，找到 `{resume.type === "master" && (...)}` 块（生成标准版入口），在其后新增 standard 类型的定制入口：

在 `{resume.type === "master" && (` 块的结束 `)}` 之后，新增：

```tsx
      {resume.type === "standard" && resume.status === "confirmed" && (
        <Card>
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">生成 JD 定制简历</p>
                <p className="text-sm text-muted-foreground">
                  基于此标准版简历和目标 JD，生成定制化简历
                </p>
              </div>
            </div>
            <Link href="/jd">
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                选择 JD 定制
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
```

同时，对于 `tailored` 类型的简历，如果存在待确认项且未完成，显示审核入口。在上述块之后新增：

```tsx
      {resume.type === "tailored" && resume.confirmableItems && resume.confirmableItems.length > 0 && !resume.confirmCompleted && (
        <Card>
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium">待确认项审核</p>
                <p className="text-sm text-muted-foreground">
                  有 {resume.confirmableItems.filter(i => i.status === "pending").length} 项 AI 推断待确认
                </p>
              </div>
            </div>
            <Link href={`/resume/${resume._id}/confirm`}>
              <Button>
                <AlertTriangle className="h-4 w-4 mr-2" />
                去审核
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add "app/(main)/resume/[id]/page.tsx"
git commit -m "feat(page): standard 简历详情页增加定制入口与待确认项提示"
```

---

## 任务 16：i18n 文案更新

**文件：** 修改 `lib/i18n/messages/zh.json`、`lib/i18n/messages/en.json`

- [ ] **步骤 1：在 zh.json 的根对象中新增 jd 模块**

在 `lib/i18n/messages/zh.json` 中，在 `"dashboard": {...}` 之后新增：
```json
,
"jd": {
  "title": "岗位 JD",
  "subtitle": "粘贴 JD，AI 解析关键词，生成定制简历",
  "newJd": "新建 JD",
  "empty": "还没有 JD，开始添加吧",
  "newTitle": "新建 JD",
  "newSubtitle": "粘贴职位描述，AI 将自动解析关键词",
  "targetRole": "目标岗位（可选）",
  "targetRoleHint": "提供目标岗位可提升 AI 解析准确度",
  "jdText": "职位描述 *",
  "jdTextPlaceholder": "粘贴完整的职位描述（JD）...",
  "charCount": "当前字数：{count}",
  "parseAndSave": "解析并保存",
  "parsing": "解析中...",
  "hardSkills": "硬技能要求",
  "softSkills": "软技能要求",
  "responsibilities": "岗位职责",
  "requirements": "任职要求",
  "niceToHave": "加分项",
  "weight": "权重 {weight}",
  "generateTailored": "生成定制简历",
  "generateTailoredHint": "基于此 JD 和你的标准版简历，生成定制化简历",
  "needStandardFirst": "请先创建并确认标准版简历",
  "selectStandard": "选择标准版简历",
  "selectStandardHint": "将基于选中的标准版简历生成定制版",
  "confirmTitle": "待确认项审核",
  "confirmHint": "AI 在生成定制简历时做了以下推断，请逐项确认",
  "accept": "接受推断",
  "keepOriginal": "保留原文",
  "custom": "自定义",
  "submitConfirm": "提交确认",
  "confirmCompleted": "所有待确认项已处理完毕",
  "matchScore": "匹配度",
  "gapAnalysis": "差距分析"
}
```

- [ ] **步骤 2：在 en.json 中新增对应英文文案**

在 `lib/i18n/messages/en.json` 中，在 `"dashboard": {...}` 之后新增：
```json
,
"jd": {
  "title": "Job Descriptions",
  "subtitle": "Paste JD, AI extracts keywords, generate tailored resume",
  "newJd": "New JD",
  "empty": "No JD yet, start adding",
  "newTitle": "New JD",
  "newSubtitle": "Paste job description, AI will extract keywords automatically",
  "targetRole": "Target Role (optional)",
  "targetRoleHint": "Providing target role improves AI parsing accuracy",
  "jdText": "Job Description *",
  "jdTextPlaceholder": "Paste full job description...",
  "charCount": "Characters: {count}",
  "parseAndSave": "Parse and Save",
  "parsing": "Parsing...",
  "hardSkills": "Hard Skills",
  "softSkills": "Soft Skills",
  "responsibilities": "Responsibilities",
  "requirements": "Requirements",
  "niceToHave": "Nice to Have",
  "weight": "Weight {weight}",
  "generateTailored": "Generate Tailored Resume",
  "generateTailoredHint": "Generate tailored resume based on this JD and your standard resume",
  "needStandardFirst": "Please create and confirm a standard resume first",
  "selectStandard": "Select Standard Resume",
  "selectStandardHint": "Will generate tailored version based on selected standard resume",
  "confirmTitle": "Confirmable Items Review",
  "confirmHint": "AI made the following inferences when generating tailored resume, please confirm each",
  "accept": "Accept",
  "keepOriginal": "Keep Original",
  "custom": "Custom",
  "submitConfirm": "Submit",
  "confirmCompleted": "All confirmable items processed",
  "matchScore": "Match Score",
  "gapAnalysis": "Gap Analysis"
}
```

- [ ] **步骤 3：Commit**

```bash
git add lib/i18n/messages/zh.json lib/i18n/messages/en.json
git commit -m "feat(i18n): 新增 JD 模块中英文文案"
```

---

## 自检

### 规格覆盖度
- ✅ JD 粘贴输入 → 任务 11（JD 输入页）
- ✅ AI 解析 JD 关键词 → 任务 7（JD 解析 API）+ 任务 3（jd-parse 提示词已存在）
- ✅ JD 列表管理 → 任务 10（列表页）+ 任务 5/6（API）
- ✅ JD 详情展示 → 任务 12（详情页）
- ✅ 基于标准版简历生成定制版 → 任务 8（tailor API）+ 任务 4（resume-tailor 提示词）
- ✅ 匹配度分析 → 任务 8（matchAnalysis 字段）+ 任务 12（可视化）
- ✅ 防幻觉待确认项机制 → 任务 3（规则）+ 任务 4（提示词）+ 任务 9（处理 API）+ 任务 14（审核页）
- ✅ 定制简历入口 → 任务 13（配置页）+ 任务 15（standard 详情页入口）
- ✅ i18n → 任务 16

### 占位符扫描
- 无 "TODO"、"待定" 等占位符
- 所有代码步骤均包含完整代码块

### 类型一致性
- `ConfirmableItem` 在任务 1 定义，任务 3/4/8/9/14 使用一致
- `MatchAnalysis` 在任务 1 定义，任务 8 使用一致
- `JdStructured` 在任务 1 定义，任务 2/5/6/7 使用一致
- `createJd`、`getJdById`、`listJdsByUser`、`updateJd`、`deleteJd` 在任务 2 定义，任务 5/6/7/8/12 使用一致

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-06-17-mycareer-phase3-jd-match.md`。

**两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

**选哪种方式？**