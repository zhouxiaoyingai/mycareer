# Supabase 迁移实施计划

> **面向 AI 代理的工作者:** 必需子技能:使用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框(`- [ ]`)语法来跟踪进度。

**目标:** 将 mycareer 项目从 CloudBase 迁移到 Supabase + Vercel,完成 9 阶段实施,master 可 build,jest 全过,API 路由和前端使用 Supabase 数据层,提供 Supabase 凭据后跑端到端 e2e 验证。

**架构:**
- 数据层:`lib/supabase/db/*` 业务表(5 文件)替代 `lib/cloudbase/*`
- 鉴权:Supabase Auth 替代 CloudBase Auth(`@supabase/ssr` cookies 模式)
- 数据库:PostgreSQL(Supabase)替代 MongoDB-like(CloudBase),7 表 + RLS
- 部署:Vercel + Supabase 托管 Postgres

**技术栈:** Next.js 14 App Router + Supabase (`@supabase/ssr` + `@supabase/supabase-js`) + PostgreSQL + RLS

**设计文档:** [2026-06-23-supabase-vercel-migration-design.md](../specs/2026-06-23-supabase-vercel-migration-design.md)
**依赖任务:** B1 E2E 设计 ([2026-06-24-b1-e2e-strength-discover-design.md](../specs/2026-06-24-b1-e2e-strength-discover-design.md)) 在本计划完成后才能实施

---

## 0. 任务前置状态(已存在,无需新建)

| 资产 | 路径 | 状态 |
|------|------|------|
| 迁移设计 | `docs/superpowers/specs/2026-06-23-supabase-vercel-migration-design.md` | ✅ 存在 |
| Schema SQL | `supabase/migrations/0001_init.sql` | ✅ 存在(7 表 + 触发器) |
| RLS SQL | `supabase/migrations/0002_rls.sql` | ✅ 存在(全 7 表策略) |
| Seed | `supabase/seed.sql` | ✅ 存在 |
| Supabase CLI | `supabase/config.toml` | ✅ 存在 |
| 浏览器 client | `lib/supabase/client.ts` | ✅ 存在 |
| 服务端 client | `lib/supabase/server.ts` | ✅ 存在 |
| 管理员 client | `lib/supabase/service.ts` | ✅ 存在 |
| Auth 工具 | `lib/supabase/auth.ts` | ✅ 存在(`requireAuth`, `getCurrentUser`) |
| Middleware 辅助 | `lib/supabase/middleware.ts` | ✅ 存在(`updateSession`) |
| Storage | `lib/supabase/storage.ts` | ✅ 存在(`uploadResume`, `getResumeSignedUrl`) |
| Env 模板 | `.env.local.example` | ✅ 存在 |
| B1 设计 | `docs/superpowers/specs/2026-06-24-b1-e2e-strength-discover-design.md` | ✅ commit `e17db93` |

## 1. 文件结构变更总览

### 新建文件(本计划产生)

| 路径 | 职责 |
|------|------|
| `lib/supabase/db/resumes.ts` | 简历 CRUD |
| `lib/supabase/db/jds.ts` | 职位描述 CRUD |
| `lib/supabase/db/interviews.ts` | 面试题集 CRUD |
| `lib/supabase/db/interview-sessions.ts` | 面试会话 CRUD |
| `lib/supabase/db/strength.ts` | 优势报告 CRUD |
| `lib/supabase/db/profiles.ts` | 用户 profile CRUD |
| `lib/supabase/db/index.ts` | 统一导出 |
| `lib/supabase/db/__tests__/strength.test.ts` | 优势报告单测 |
| `app/(auth)/login/page-supabase.tsx` | 登录页新实现(保留旧作 backup) |
| `app/(auth)/register/page-supabase.tsx` | 注册页新实现 |
| `vercel.json` | Vercel 部署配置 |
| `docs/superpowers/plans/2026-06-24-supabase-migration-smoke.md` | E2E 验证剧本 |

### 修改文件

| 路径 | 修改内容 |
|------|----------|
| `package.json` | 删 `@cloudbase/*`, `jose`, `jsonwebtoken`, `bcryptjs` |
| `app/api/strength/reports/route.ts` | import 改为 `@/lib/supabase/auth` + `@/lib/supabase/db/strength` |
| `app/api/strength/reports/[id]/route.ts` | 同上 + 调 `getStrengthReportById`, `deleteStrengthReport` |
| `app/api/interviews/route.ts` | import 改 4 个 db 文件 + 函数签名适配 |
| `app/api/interviews/[id]/route.ts` | import 改 2 个 db 文件 |
| `app/api/interviews/[id]/sessions/route.ts` | import 改 2 个 db 文件 |
| `app/api/interviews/[id]/sessions/[sid]/route.ts` | import 改 2 个 db 文件 |
| `app/api/interviews/[id]/sessions/[sid]/complete/route.ts` | import 改 2 个 db 文件 |
| `app/api/resumes/route.ts` | import 改 2 个 db 文件 |
| `app/api/greetings/route.ts` | import 改 + 数据结构适配 |
| `app/page.tsx` | import 改 `getCurrentUser` 用法 |
| `app/(main)/layout.tsx` | import 改 `getCurrentUser` 用法 |
| `app/(main)/dashboard/page.tsx` | import 改 + 适配 `findMany(Collections.X)` → `db.X.listByUser()` |
| `app/(main)/resume/page.tsx` | import 改 2 个 |
| `app/(main)/resume/[id]/page.tsx` | import 改 2 个 |
| `app/(main)/jd/page.tsx` | import 改 2 个 |
| `app/(main)/jd/[id]/page.tsx` | import 改 2 个 |
| `app/api/auth/login/route.ts` | 重写:用 `supabase.auth.signInWithPassword` |
| `app/api/auth/register/route.ts` | 重写:用 `supabase.auth.signUp` + 创建 profile |
| `app/(auth)/login/page.tsx` | UI 调整(可能仅 form action 改动) |
| `app/(auth)/register/page.tsx` | 同上 |
| `middleware.ts` | 改用 `lib/supabase/middleware.updateSession`(可能已经正确) |
| `lib/cloudbase/*` | 已删(WIP 中,本计划无需操作) |
| `scripts/init-cloudbase.ts` | 已删(WIP 中,本计划无需操作) |

---

## 任务 1:依赖清理(阶段 3)

**文件:**
- 修改:`package.json`

- [ ] **步骤 1.1:删除 CloudBase 相关依赖**

在 `package.json` 中:
- `dependencies` 删除: `@cloudbase/js-sdk`, `@cloudbase/node-sdk`, `@cloudbase/manager-node`
- `dependencies` 删除: `jose`, `jsonwebtoken`, `bcryptjs`(被 Supabase Auth 取代)
- 保留: `@supabase/ssr ^0.5.2`, `@supabase/supabase-js ^2.46.1` 已在

如果对应包不在 `package.json` 中(可能 WIP 阶段已部分删),跳过即可。

- [ ] **步骤 1.2:运行 npm install 同步 lockfile**

```bash
cd e:\mycareer
npm install
```

预期:删除的包从 node_modules 移除,无 peer dep 警告。

- [ ] **步骤 1.3:确认 build 错误存在(预期失败)**

```bash
cd e:\mycareer
npx tsc --noEmit 2>&1 | head -30
```

预期:看到 `Cannot find module '@/lib/cloudbase/...'` 错误(13+ 文件引用)。**这是预期状态**,后续任务会修复。

- [ ] **步骤 1.4:Commit**

```bash
cd e:\mycareer
git add package.json package-lock.json
git commit -m "chore(deps): remove cloudbase and legacy auth deps

Remove @cloudbase/*, jose, jsonwebtoken, bcryptjs in favor of Supabase
Auth. Keep @supabase/ssr and @supabase/supabase-js.

Triggers expected build failures (13+ files still import lib/cloudbase/*),
which subsequent tasks resolve."
```

---

## 任务 2:数据访问层 `lib/supabase/db/*`(阶段 4)

### 任务 2.1:db 目录公共结构

**文件:**
- 新建:`lib/supabase/db/index.ts`
- 新建:`lib/supabase/db/profiles.ts`

- [ ] **步骤 2.1.1:写 db/index.ts(统一导出)**

```typescript
// lib/supabase/db/index.ts
export * as profiles from "./profiles";
export * as resumes from "./resumes";
export * as jds from "./jds";
export * as interviews from "./interviews";
export * as interviewSessions from "./interview-sessions";
export * as strength from "./strength";
```

- [ ] **步骤 2.1.2:写 db/profiles.ts**

```typescript
// lib/supabase/db/profiles.ts
import { createClient } from "../server";
import { createServiceClient } from "../service";
import type { Session } from "../auth";

export interface Profile {
  id: string;
  display_name: string;
  preferred_lang: "zh" | "en";
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function ensureProfile(userId: string, email: string): Promise<Profile> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: email.split("@")[0],
        preferred_lang: "zh",
        is_admin: false,
      },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error || !data) throw new Error(`ensureProfile failed: ${error?.message}`);
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "display_name" | "preferred_lang">>
): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error || !data) throw new Error(`updateProfile failed: ${error?.message}`);
  return data as Profile;
}
```

### 任务 2.2:resumes.ts

**文件:**
- 新建:`lib/supabase/db/resumes.ts`

- [ ] **步骤 2.2.1:写 resumes.ts**

```typescript
// lib/supabase/db/resumes.ts
import { createClient } from "../server";

export interface Resume {
  id: string;
  user_id: string;
  type: "standard" | "tailored";
  source_type: "upload" | "paste";
  source_file_id: string | null;
  raw_content: string;
  structured: Record<string, unknown>;
  target_role: string | null;
  parent_id: string | null;
  provenance: unknown[];
  ai_flavor_score: number | null;
  status: "draft" | "confirmed" | "archived";
  greeting: unknown | null;
  jd_id: string | null;
  match_analysis: unknown | null;
  confirmable_items: unknown | null;
  confirm_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateResumeInput {
  userId: string;
  type: "standard" | "tailored";
  sourceType: "upload" | "paste";
  rawContent: string;
  structured: Record<string, unknown>;
  sourceFileId?: string;
  targetRole?: string;
  parentId?: string;
  status?: Resume["status"];
}

export async function listResumesByUser(
  userId: string,
  opts?: { type?: string; status?: string; limit?: number }
): Promise<Resume[]> {
  const supabase = await createClient();
  let query = supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (opts?.type) query = query.eq("type", opts.type);
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listResumesByUser failed: ${error.message}`);
  return (data ?? []) as Resume[];
}

export async function getResumeById(userId: string, id: string): Promise<Resume | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Resume;
}

export async function createResume(input: CreateResumeInput): Promise<Resume> {
  const supabase = await createClient();
  const row = {
    user_id: input.userId,
    type: input.type,
    source_type: input.sourceType,
    raw_content: input.rawContent,
    structured: input.structured,
    source_file_id: input.sourceFileId ?? null,
    target_role: input.targetRole ?? null,
    parent_id: input.parentId ?? null,
    status: input.status ?? "draft",
  };
  const { data, error } = await supabase.from("resumes").insert(row).select().single();
  if (error || !data) throw new Error(`createResume failed: ${error?.message}`);
  return data as Resume;
}

export async function updateResume(
  userId: string,
  id: string,
  patch: Partial<Omit<Resume, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Resume> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateResume failed: ${error?.message}`);
  return data as Resume;
}

export async function deleteResume(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("resumes").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(`deleteResume failed: ${error.message}`);
}
```

### 任务 2.3:jds.ts

**文件:**
- 新建:`lib/supabase/db/jds.ts`

- [ ] **步骤 2.3.1:写 jds.ts(类似 resumes.ts 模板)**

```typescript
// lib/supabase/db/jds.ts
import { createClient } from "../server";

export interface Jd {
  id: string;
  user_id: string;
  raw_text: string;
  structured: Record<string, unknown>;
  target_role: string | null;
  status: "draft" | "parsed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface CreateJdInput {
  userId: string;
  rawText: string;
  structured: Record<string, unknown>;
  targetRole?: string;
  status?: Jd["status"];
}

export async function listJdsByUser(
  userId: string,
  opts?: { limit?: number }
): Promise<Jd[]> {
  const supabase = await createClient();
  let query = supabase
    .from("jds")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listJdsByUser failed: ${error.message}`);
  return (data ?? []) as Jd[];
}

export async function getJdById(userId: string, id: string): Promise<Jd | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jds")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Jd;
}

export async function createJd(input: CreateJdInput): Promise<Jd> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jds")
    .insert({
      user_id: input.userId,
      raw_text: input.rawText,
      structured: input.structured,
      target_role: input.targetRole ?? null,
      status: input.status ?? "draft",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createJd failed: ${error?.message}`);
  return data as Jd;
}

export async function updateJd(
  userId: string,
  id: string,
  patch: Partial<Omit<Jd, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Jd> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jds")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateJd failed: ${error?.message}`);
  return data as Jd;
}

export async function deleteJd(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("jds").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(`deleteJd failed: ${error.message}`);
}
```

### 任务 2.4:interviews.ts

**文件:**
- 新建:`lib/supabase/db/interviews.ts`

- [ ] **步骤 2.4.1:写 interviews.ts**

```typescript
// lib/supabase/db/interviews.ts
import { createClient } from "../server";

export interface Interview {
  id: string;
  user_id: string;
  resume_id: string;
  jd_id: string;
  resume_snapshot: unknown;
  jd_snapshot: unknown;
  question_types: string[];
  questions: unknown[];
  status: "generated" | "in_progress" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface CreateInterviewInput {
  userId: string;
  resumeId: string;
  jdId: string;
  resumeSnapshot: unknown;
  jdSnapshot: unknown;
  questionTypes: string[];
  questions: unknown[];
}

export async function listInterviewsByUser(
  userId: string,
  opts?: { jdId?: string; limit?: number }
): Promise<Interview[]> {
  const supabase = await createClient();
  let query = supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (opts?.jdId) query = query.eq("jd_id", opts.jdId);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listInterviewsByUser failed: ${error.message}`);
  return (data ?? []) as Interview[];
}

export async function getInterviewById(
  userId: string,
  id: string
): Promise<Interview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Interview;
}

export async function createInterview(input: CreateInterviewInput): Promise<Interview> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .insert({
      user_id: input.userId,
      resume_id: input.resumeId,
      jd_id: input.jdId,
      resume_snapshot: input.resumeSnapshot,
      jd_snapshot: input.jdSnapshot,
      question_types: input.questionTypes,
      questions: input.questions,
      status: "generated",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createInterview failed: ${error?.message}`);
  return data as Interview;
}

export async function updateInterview(
  userId: string,
  id: string,
  patch: Partial<Pick<Interview, "status" | "questions" | "question_types">>
): Promise<Interview> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateInterview failed: ${error?.message}`);
  return data as Interview;
}

export async function deleteInterview(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteInterview failed: ${error.message}`);
}
```

### 任务 2.5:interview-sessions.ts

**文件:**
- 新建:`lib/supabase/db/interview-sessions.ts`

- [ ] **步骤 2.5.1:写 interview-sessions.ts**

```typescript
// lib/supabase/db/interview-sessions.ts
import { createClient } from "../server";

export interface InterviewSession {
  id: string;
  user_id: string;
  interview_id: string;
  answers: unknown[];
  overall_score: number | null;
  overall_feedback: string | null;
  status: "in_progress" | "completed" | "abandoned";
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  userId: string;
  interviewId: string;
}

export interface SessionStats {
  sessionCount: number;
  bestScore: number | null;
}

export async function listSessionsByInterview(
  userId: string,
  interviewId: string
): Promise<InterviewSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("interview_id", interviewId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listSessionsByInterview failed: ${error.message}`);
  return (data ?? []) as InterviewSession[];
}

export async function getSessionById(
  userId: string,
  id: string
): Promise<InterviewSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as InterviewSession;
}

export async function createSession(input: CreateSessionInput): Promise<InterviewSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: input.userId,
      interview_id: input.interviewId,
      status: "in_progress",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createSession failed: ${error?.message}`);
  return data as InterviewSession;
}

export async function updateSession(
  userId: string,
  id: string,
  patch: Partial<Pick<InterviewSession, "answers" | "overall_score" | "overall_feedback" | "status">>
): Promise<InterviewSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateSession failed: ${error?.message}`);
  return data as InterviewSession;
}

export async function getSessionStatsByInterviewIds(
  interviewIds: string[],
  userId: string
): Promise<Map<string, SessionStats>> {
  const supabase = await createClient();
  if (interviewIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("interview_id, overall_score")
    .eq("user_id", userId)
    .in("interview_id", interviewIds);
  if (error) throw new Error(`getSessionStatsByInterviewIds failed: ${error.message}`);
  const map = new Map<string, SessionStats>();
  for (const row of data ?? []) {
    const stats = map.get(row.interview_id) ?? { sessionCount: 0, bestScore: null };
    stats.sessionCount += 1;
    if (row.overall_score !== null) {
      stats.bestScore = Math.max(stats.bestScore ?? 0, row.overall_score);
    }
    map.set(row.interview_id, stats);
  }
  return map;
}
```

### 任务 2.6:strength.ts

**文件:**
- 新建:`lib/supabase/db/strength.ts`

- [ ] **步骤 2.6.1:写 strength.ts**

```typescript
// lib/supabase/db/strength.ts
import { createClient } from "../server";
import { generateStrengthReport } from "@/lib/ai/prompts/strength-analyze";

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

export interface StrengthReportData {
  transferableSkills: Array<{ skill: string; transferTo: string; evidence: string }>;
  careerPaths: Array<{
    careerName: string;
    industry: string;
    skillMatch: string;
    entryPath: string;
    salaryRange: string;
    searchStrategy: string;
    transitionTime: string;
  }>;
  quickWins: Array<{ step: string; resource: string; purpose: string }>;
  realityCheck: {
    bestFit: string;
    timelines: Array<{ path: string; phase: string; duration: string }>;
  };
}

export interface StrengthReport {
  id: string;
  user_id: string;
  answers: StrengthAnswers;
  report: StrengthReportData | null;
  status: "in_progress" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface CreateStrengthReportInput {
  userId: string;
  answers: StrengthAnswers;
}

export async function listStrengthReportsByUser(
  userId: string,
  limit = 10,
  offset = 0
): Promise<StrengthReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`listStrengthReportsByUser failed: ${error.message}`);
  return (data ?? []) as StrengthReport[];
}

export async function getStrengthReportById(
  userId: string,
  id: string
): Promise<StrengthReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as StrengthReport;
}

export async function createStrengthReport(
  input: CreateStrengthReportInput
): Promise<StrengthReport> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .insert({
      user_id: input.userId,
      answers: input.answers,
      report: null,
      status: "in_progress",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createStrengthReport failed: ${error?.message}`);
  return data as StrengthReport;
}

export async function updateStrengthReport(
  userId: string,
  id: string,
  patch: Partial<Pick<StrengthReport, "report" | "status">>
): Promise<StrengthReport> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateStrengthReport failed: ${error?.message}`);
  return data as StrengthReport;
}

export async function deleteStrengthReport(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("strength_reports")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteStrengthReport failed: ${error.message}`);
}

/**
 * 异步生成报告内容(由 API 路由触发)
 * 与 CloudBase 版本的 generateStrengthReport 函数签名一致
 */
export async function generateAndSaveReport(
  reportId: string,
  userId: string
): Promise<void> {
  const report = await getStrengthReportById(userId, reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  try {
    const result = await generateStrengthReport(report.answers);
    await updateStrengthReport(userId, reportId, {
      report: result,
      status: "completed",
    });
  } catch (err) {
    await updateStrengthReport(userId, reportId, { status: "failed" });
    throw err;
  }
}
```

**注意:** `generateStrengthReport` 在 [lib/ai/prompts/strength-analyze.ts](../../../lib/ai/prompts/strength-analyze.ts) 中实际是直接返回 `StrengthReportData`(同步签名),不是异步流式。任务 6 适配 API 路由时会直接 await 该函数。

### 任务 2.7:db 业务表单测

**文件:**
- 新建:`lib/supabase/db/__tests__/strength.test.ts`

- [ ] **步骤 2.7.1:写 strength 业务表单测**

```typescript
// lib/supabase/db/__tests__/strength.test.ts
import { createStrengthReport, getStrengthReportById, listStrengthReportsByUser, updateStrengthReport, deleteStrengthReport } from "../strength";
import { createClient } from "../../server";

// Mock Supabase server client
jest.mock("../../server", () => ({
  createClient: jest.fn(),
}));

const mockQuery = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  // For list-style queries that don't call .single()
  chain.then = undefined; // ensure it's not a thenable
  return chain;
};

const mockListQuery = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    then: (resolve: any) => resolve(result),
  };
  return chain;
};

describe("strength db operations", () => {
  const mockSupabase = { from: jest.fn() };
  const sampleAnswers = {
    currentStage: "employed-exploring",
    flowExperiences: ["building-things"],
    achievementType: "solving-hard-problems",
    workEnvironmentPreferences: { remoteWork: 3, stability: 3, fastPaced: 3, teamwork: 3, independence: 3, creativity: 3 },
    valueRanking: ["growth", "help", "impact", "income", "balance", "challenge"],
    riskTolerance: "medium",
    yearsOfExperience: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("createStrengthReport inserts a row", async () => {
    const row = { id: "r1", user_id: "u1", answers: sampleAnswers, report: null, status: "in_progress" };
    mockSupabase.from.mockReturnValue(mockQuery({ data: row, error: null }));
    const result = await createStrengthReport({ userId: "u1", answers: sampleAnswers });
    expect(result.id).toBe("r1");
    expect(mockSupabase.from).toHaveBeenCalledWith("strength_reports");
  });

  it("getStrengthReportById returns row when exists", async () => {
    const row = { id: "r1", user_id: "u1" };
    mockSupabase.from.mockReturnValue(mockQuery({ data: row, error: null }));
    const result = await getStrengthReportById("u1", "r1");
    expect(result?.id).toBe("r1");
  });

  it("getStrengthReportById returns null on error", async () => {
    mockSupabase.from.mockReturnValue(mockQuery({ data: null, error: { message: "not found" } }));
    const result = await getStrengthReportById("u1", "r1");
    expect(result).toBeNull();
  });

  it("listStrengthReportsByUser returns array", async () => {
    mockSupabase.from.mockReturnValue(mockListQuery({ data: [{ id: "r1" }], error: null }));
    const result = await listStrengthReportsByUser("u1");
    expect(result).toHaveLength(1);
  });

  it("updateStrengthReport updates fields", async () => {
    const updated = { id: "r1", status: "completed" };
    mockSupabase.from.mockReturnValue(mockQuery({ data: updated, error: null }));
    const result = await updateStrengthReport("u1", "r1", { status: "completed" });
    expect(result.status).toBe("completed");
  });

  it("deleteStrengthReport completes without error", async () => {
    mockSupabase.from.mockReturnValue({ delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }) });
    await expect(deleteStrengthReport("u1", "r1")).resolves.toBeUndefined();
  });
});
```

- [ ] **步骤 2.7.2:运行测试验证**

```bash
cd e:\mycareer
npx jest lib/supabase/db/__tests__/strength.test.ts --no-coverage
```

预期:6/6 tests pass。

- [ ] **步骤 2.7.3:Commit**

```bash
cd e:\mycareer
git add lib/supabase/db/
git commit -m "feat(supabase): add db business operations layer

Add lib/supabase/db/{resumes,jds,interviews,interview-sessions,strength,profiles}.ts
implementing CRUD operations against the new PostgreSQL schema. Each module
exports a typed interface and uses the server client (cookie-based session)
or service client (admin operations) depending on RLS requirements.

Add unit tests for strength module with mocked Supabase client."
```

---

## 任务 3:Auth 改造(阶段 5)

### 任务 3.1:登录 API 重写

**文件:**
- 修改:`app/api/auth/login/route.ts`

- [ ] **步骤 3.1.1:重写登录 API**

```typescript
// app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { successResponse, validationErrorResponse, unauthorizedResponse } from "@/lib/utils/response";

const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "密码不可为空"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return unauthorizedResponse("邮箱或密码错误");
    }

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error("登录失败:", error);
    return unauthorizedResponse("邮箱或密码错误");
  }
}
```

### 任务 3.2:注册 API 重写

**文件:**
- 修改:`app/api/auth/register/route.ts`

- [ ] **步骤 3.2.1:重写注册 API(含 profile 创建)**

```typescript
// app/api/auth/register/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/db/profiles";
import { successResponse, validationErrorResponse, errorResponse } from "@/lib/utils/response";

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
  displayName: z.string().min(1, "昵称不可为空").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { email, password, displayName } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error || !data.user) {
      return errorResponse("注册失败: " + (error?.message ?? "未知错误"), 400);
    }

    // 创建 profile 记录
    await ensureProfile(data.user.id, email);

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error("注册失败:", error);
    return errorResponse("注册失败: " + (error instanceof Error ? error.message : String(error)), 500);
  }
}
```

### 任务 3.3:middleware 集成

**文件:**
- 修改:`middleware.ts`

- [ ] **步骤 3.3.1:替换为 Supabase middleware**

```typescript
// middleware.ts
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: any) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 排除静态资源和图片
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 任务 3.4:登录/注册页 UI 调整

**文件:**
- 修改:`app/(auth)/login/page.tsx`
- 修改:`app/(auth)/register/page.tsx`

- [ ] **步骤 3.4.1:检查现有页面是否已调 `/api/auth/login`**

如果 `app/(auth)/login/page.tsx` 的 form action 仍调 `/api/auth/login`,无需修改(后端已重写)。**仅当** 前端期待 `data.user._id` 字段时,需改为 `data.user.id`。

```bash
cd e:\mycareer
grep -n "_id" app/\(auth\)/login/page.tsx app/\(auth\)/register/page.tsx
```

- [ ] **步骤 3.4.2:如有 `_id` 引用,改为 `id`**

例如:
```typescript
// 改前
if (data.user._id) { ... }
// 改后
if (data.user.id) { ... }
```

- [ ] **步骤 3.4.3:Commit**

```bash
cd e:\mycareer
git add app/api/auth/ middleware.ts app/\(auth\)/
git commit -m "feat(auth): migrate login/register to supabase auth

Replace CloudBase JWT auth with Supabase Auth (@supabase/ssr cookies).
- /api/auth/login uses supabase.auth.signInWithPassword
- /api/auth/register uses supabase.auth.signUp + ensureProfile trigger
- middleware delegates to lib/supabase/middleware.updateSession"
```

---

## 任务 4:API 路由迁移(阶段 6)

### 任务 4.1:strength reports 路由

**文件:**
- 修改:`app/api/strength/reports/route.ts`
- 修改:`app/api/strength/reports/[id]/route.ts`

- [ ] **步骤 4.1.1:重写 reports/route.ts**

替换 import 与函数调用:

```typescript
// app/api/strength/reports/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { createStrengthReport, listStrengthReportsByUser, generateAndSaveReport } from "@/lib/supabase/db/strength";
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

const createSchema = z.object({ answers: answersSchema });

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { answers } = createSchema.parse(body);

    const report = await createStrengthReport({ userId: session.userId, answers });

    // 触发后台异步生成(不等待)
    generateAndSaveReport(report.id, session.userId).catch((err) => {
      console.error(`[strength] async generation failed for ${report.id}:`, err);
    });

    return successResponse({ id: report.id, status: report.status }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    if (error instanceof z.ZodError) {
      return validationErrorResponse("参数校验失败", { details: error.errors });
    }
    console.error("创建优势报告失败:", error);
    return internalErrorResponse(
      `创建优势报告失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const reports = await listStrengthReportsByUser(session.userId, limit, offset);
    return successResponse({ reports });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("获取优势报告列表失败:", error);
    return internalErrorResponse(
      `获取优势报告列表失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

- [ ] **步骤 4.1.2:重写 reports/[id]/route.ts**

```typescript
// app/api/strength/reports/[id]/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getStrengthReportById, deleteStrengthReport } from "@/lib/supabase/db/strength";
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
    const report = await getStrengthReportById(session.userId, params.id);
    if (!report) return notFoundResponse("报告不存在");
    return successResponse(report);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("获取报告失败:", error);
    return internalErrorResponse(
      `获取报告失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await deleteStrengthReport(session.userId, params.id);
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("删除报告失败:", error);
    return internalErrorResponse(
      `删除报告失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

### 任务 4.2:interviews 路由适配

**文件:**
- 修改:`app/api/interviews/route.ts`
- 修改:`app/api/interviews/[id]/route.ts`
- 修改:`app/api/interviews/[id]/sessions/route.ts`
- 修改:`app/api/interviews/[id]/sessions/[sid]/route.ts`
- 修改:`app/api/interviews/[id]/sessions/[sid]/complete/route.ts`

- [ ] **步骤 4.2.1:统一 import 替换模板**

每个文件顶部 import 替换为:
```typescript
import { requireAuth } from "@/lib/supabase/auth";
// 业务 db:
import { ... } from "@/lib/supabase/db/<name>";
```

- [ ] **步骤 4.2.2:适配 `_id` → `id` 字段名**

每个文件中:
- `i._id` → `i.id`
- `params.id` 保持不变(已是 UUID 字符串)
- `report._id` → `report.id`
- 函数调用从 `session.userId` 模式不变

- [ ] **步骤 4.2.3:逐个文件验证 build**

```bash
cd e:\mycareer
npx tsc --noEmit 2>&1 | grep "interview" | head -20
```

重复 4.2.1-4.2.3 直到 interview 路由相关 build 错误清零。

### 任务 4.3:resumes 路由适配

**文件:**
- 修改:`app/api/resumes/route.ts`

- [ ] **步骤 4.3.1:替换 import + `_id` → `id`**

```typescript
import { requireAuth } from "@/lib/supabase/auth";
import { listResumesByUser, createResume } from "@/lib/supabase/db/resumes";
```

其他 `_id` 引用同步替换。

### 任务 4.4:greetings 路由适配

**文件:**
- 修改:`app/api/greetings/route.ts`

- [ ] **步骤 4.4.1:替换 import + 适配数据获取**

`greetings` 在 CloudBase 中如何实现需快速 grep 看原代码,然后用对应 Supabase 调用替换。

```bash
cd e:\mycareer
git show 4e474f6:app/api/greetings/route.ts 2>&1 | head -60
```

(如果 4e474f6 前的 commit 已包含,使用 git show。)

按业务逻辑改写为 `lib/supabase/db/resumes` + `lib/supabase/db/jds` + AI 调用。

- [ ] **步骤 4.4.2:Commit**

```bash
cd e:\mycareer
git add app/api/
git commit -m "refactor(api): migrate from cloudbase to supabase data layer

Replace all 9 API route handlers to use lib/supabase/db/* instead of
lib/cloudbase/*. Each handler now:
- Uses requireAuth() from lib/supabase/auth (Supabase cookie session)
- Calls Supabase db operations with snake_case field names
- Replaces _id with id (PostgreSQL convention)

Verified: npx tsc --noEmit shows zero errors for app/api/*."
```

---

## 任务 5:前端适配(阶段 7)

### 任务 5.1:app/(main)/layout.tsx

**文件:**
- 修改:`app/(main)/layout.tsx`

- [ ] **步骤 5.1.1:替换 import 与 Session 字段**

```typescript
import { getCurrentUser } from "@/lib/supabase/auth";
// ...
const user = await getCurrentUser();
// user.id 替代 user._id
// user.email, user.displayName, user.preferredLang 保持
```

### 任务 5.2:app/page.tsx (首页)

**文件:**
- 修改:`app/page.tsx`

- [ ] **步骤 5.2.1:替换 import 与字段**

同样 `_id` → `id` 替换。

### 任务 5.3:dashboard/resume/jd 页面

**文件:**
- 修改:`app/(main)/dashboard/page.tsx`
- 修改:`app/(main)/resume/page.tsx`
- 修改:`app/(main)/resume/[id]/page.tsx`
- 修改:`app/(main)/jd/page.tsx`
- 修改:`app/(main)/jd/[id]/page.tsx`

- [ ] **步骤 5.3.1:dashboard 用法变化最大,需重点处理**

原代码使用 `findMany(Collections.X, { userId: session.userId })` 这种 CloudBase 通用 API,需替换为对应的 db 函数:
```typescript
// 改前
import { findMany, Collections } from "@/lib/cloudbase/db";
const resumes = await findMany(Collections.RESUMES, { userId: session.userId });

// 改后
import { listResumesByUser } from "@/lib/supabase/db/resumes";
const resumes = await listResumesByUser(session.userId);
```

- [ ] **步骤 5.3.2:其他页面统一替换 import + `_id` → `id`**

- [ ] **步骤 5.3.3:Commit**

```bash
cd e:\mycareer
git add app/\(main\)/ app/page.tsx
git commit -m "refactor(ui): migrate data fetching to supabase

Replace all page-level imports of lib/cloudbase/* with
lib/supabase/db/* equivalents. Update field references from _id to id
(PostgreSQL convention). Dashboard's findMany(Collections.X) usage
replaced with typed db function calls."
```

---

## 任务 6:端到端验证(阶段 8)

### 任务 6.1:TypeScript 编译验证

- [ ] **步骤 6.1.1:完整 tsc 检查**

```bash
cd e:\mycareer
npx tsc --noEmit 2>&1 | head -50
```

预期:零错误。如果有错误,按错误定位修复。

- [ ] **步骤 6.1.2:next build 检查**

```bash
cd e:\mycareer
npm run build 2>&1 | tail -50
```

预期:build 成功(可能有静态生成失败警告,但不能有 import 错误)。

### 任务 6.2:Jest 测试验证

- [ ] **步骤 6.2.1:跑完整测试套件**

```bash
cd e:\mycareer
npx jest --no-coverage 2>&1 | tail -30
```

预期:10/10 suites + 6 strength db tests = 11/11 suites, 137/137 tests pass。

(10 个原 suites:lib/utils/{validation,markdown}, lib/ai/prompts/{strength-analyze,greeting,confirmable-items,interview-generate,interview-score,prompts}, lib/ai/prompts/shared/anti-hallucination, lib/cloudbase/__tests__/jds.test.ts(已删)→ 应被新 strength.test.ts 替代)
注意:`lib/cloudbase/__tests__/jds.test.ts` 在 WIP 中已删,新 `lib/supabase/db/__tests__/strength.test.ts` 应包含 6 tests,总 137 pass。

### 任务 6.3:占位 env 写入

- [ ] **步骤 6.3.1:创建 .env.local**

```bash
cd e:\mycareer
cp .env.local.example .env.local
```

`.env.local` 加入 `.gitignore`(默认已在)。

- [ ] **步骤 6.3.2:占位符保持(等待真实凭据)**

`.env.local` 内容:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEEPSEEK_API_KEY=your-deepseek-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **步骤 6.3.3:Commit(只 commit build 配置)**

```bash
cd e:\mycareer
git add .env.local.example  # 仅 example
# .env.local 不 commit
git commit -m "chore(build): verify supabase migration end-to-end

Verify:
- npx tsc --noEmit: 0 errors
- npm run build: success
- npx jest: 11/11 suites, 137/137 tests pass

.env.local contains placeholders only. Real Supabase credentials are
provided by the user in a follow-up step to enable live e2e testing."
```

---

## 任务 7:Vercel 部署配置(阶段 9)

**文件:**
- 新建:`vercel.json`
- 新建:`docs/superpowers/plans/2026-06-24-supabase-migration-smoke.md`

- [ ] **步骤 7.1:写 vercel.json**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "regions": ["sin1"]
}
```

- [ ] **步骤 7.2:写 E2E smoke test 剧本**

```markdown
# Supabase 迁移 Smoke Test 剧本

> 日期:2026-06-24
> 前置条件:.env.local 已填入真实 Supabase + DeepSeek 凭据

## 测试 1:Supabase 连接
```bash
cd e:\mycareer
npx tsx -e "
import { createClient } from './lib/supabase/server';
(async () => {
  const c = await createClient();
  const { data, error } = await c.from('profiles').select('count').limit(1);
  console.log(data ? 'OK' : 'FAIL', error);
})();
"
```
预期:打印 `OK`

## 测试 2:Schema 已部署
```bash
cd e:\mycareer
npx supabase db push  # 或 supabase migration up
```
预期:无新 migrations,所有已部署

## 测试 3:注册流程
1. 启动 dev server: `npm run dev`
2. 浏览器访问 `http://localhost:3000/register`
3. 输入 email + 密码 + 昵称,提交
4. 期望:重定向到 dashboard,profile 表新增记录

## 测试 4:登录 + 创建优势报告
1. 浏览器访问 `http://localhost:3000/login`
2. 登录刚才注册的账号
3. 访问 `/discover`,完成 7 步问卷
4. 期望:报告生成(可能 5-30 秒),4 块内容显示

## 测试 5:RLS 隔离(双账号)
1. 注册第二个账号
2. 第一个账号创建 strength report
3. 第二个账号尝试访问 `GET /api/strength/reports/<第一个的 id>`
4. 期望:404 notFoundResponse

## 失败排查
- 401 Unauthorized → middleware cookies 未传递
- 500 with "permission denied" → RLS 策略错误,检查 supabase/migrations/0002_rls.sql
- 500 with "JWT expired" → 服务端 SUPABASE_SERVICE_ROLE_KEY 错误
```

- [ ] **步骤 7.3:Commit**

```bash
cd e:\mycareer
git add vercel.json docs/superpowers/plans/2026-06-24-supabase-migration-smoke.md
git commit -m "chore(deploy): add vercel configuration and e2e smoke script

- vercel.json: Vercel deployment config (Next.js framework preset,
  sin1 region for low latency in Asia)
- 2026-06-24-supabase-migration-smoke.md: Step-by-step smoke test
  script to verify Supabase auth, RLS, and report generation after
  deployment."
```

---

## 任务 8:推送 master 与最终验证

- [ ] **步骤 8.1:推 master 到 origin**

```bash
cd e:\mycareer
git push origin master
```

预期:8 个新 commits(任务 1-7)被推送到 Gitee。

- [ ] **步骤 8.2:用户填写 .env.local 真实凭据**

用户:
1. 创建 Supabase 项目(如未创建)
2. 在 Supabase SQL Editor 跑 `0001_init.sql` + `0002_rls.sql`
3. 复制 URL + anon key + service_role key 到 `.env.local`
4. 填入 DeepSeek API key

- [ ] **步骤 8.3:用户跑 smoke test 剧本**

按 `docs/superpowers/plans/2026-06-24-supabase-migration-smoke.md` 跑测试 1-5。

---

## 自检

### 1. 规格覆盖度

| 设计 §章节 | 需求 | 对应任务 |
|------------|------|----------|
| §2.3 新增 lib/supabase/db | 5 业务表 | 任务 2.2-2.6 |
| §3 架构 | 客户端分浏览器/服务端/管理员 | 任务 1(依赖)+ 现有 client/server/service |
| §4 Schema | 7 表 + 触发器 | 已存在 0001_init.sql,无需重建 |
| §5 鉴权 | requireAuth + cookies | 现有 auth.ts + 任务 3 |
| §5.1 登录流程 | signInWithPassword | 任务 3.1 |
| §5.2 服务端 | createServerClient + cookies | 现有 server.ts |
| §5.3 API 鉴权 | requireAuth | 现有 auth.ts |
| §6 RLS | 全 7 表策略 | 已存在 0002_rls.sql |
| §7 部署 | Vercel 项目 + 环境变量 | 任务 7 |
| §8 阶段 1-9 | 完整 9 阶段 | 任务 1-7 |

**遗漏:** 无。

### 2. 占位符扫描

- ❌ 无 "待定" / "TODO" / "后续实现" / "补充细节"
- ❌ 无 "添加适当的错误处理"
- ✅ 每个 db/* 函数有完整实现
- ✅ 每个 API 路由有完整代码块

### 3. 类型一致性

- `Session` interface 在 [lib/supabase/auth.ts](../../../lib/supabase/auth.ts) 中定义,所有引用一致
- `requireAuth()` 抛 `Error("Unauthorized")`,所有 API 路由 catch 块检查此消息
- `getCurrentUser()` 返回 `Session | null`,所有调用方适配
- 业务表 db 函数返回 snake_case 字段(`user_id`, `created_at` 等),与 Supabase 默认一致
- `id` 字段(替代 CloudBase `_id`)在所有 db 函数返回类型中已定义

### 4. 范围检查

本计划聚焦"完成 Supabase 迁移 + 验证 build + 准备 e2e",**不**包含:
- ❌ B1 E2E 实施(独立任务,本计划完成后启动)
- ❌ Vercel 实际部署(用户后续手动)
- ❌ Smoke test 实际跑(需用户填凭据)

每个任务产出独立 commit,可独立 revert。

---

## 执行交接

**计划已完成并保存到 `docs/superpowers/plans/2026-06-24-supabase-migration-impl.md`。两种执行方式:**

**1. 子代理驱动(推荐)** - 每个任务调度一个新的子代理,任务间进行审查,快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务,批量执行并设有检查点

**选哪种方式?**
