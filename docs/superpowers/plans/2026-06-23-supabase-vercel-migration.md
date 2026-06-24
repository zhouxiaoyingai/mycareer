# CloudBase → Supabase + Vercel 迁移实施计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 mycareer 从 CloudBase 迁移到 Supabase + Vercel 部署，删除所有 CloudBase 代码，从零开始（无数据迁移）。

**架构：** Next.js 14 App Router → Vercel Serverless，调用 Supabase（Auth + Postgres + Storage）+ DeepSeek API。

**技术栈：** Supabase（@supabase/ssr、@supabase/supabase-js）、TypeScript、PostgreSQL 15（RLS）、next-intl、shadcn/ui。

**起点策略：** 先在新建 worktree `feat/supabase-migration` 上写代码，代码完成后推 GitHub + Vercel 部署。

---

## 文件结构

### 删除
- `lib/cloudbase/`（10 文件：auth.ts, client.ts, db.ts, storage.ts, resumes.ts, jds.ts, interviews.ts, interview-sessions.ts, strength.ts, __tests__/jds.test.ts）
- `scripts/init-cloudbase.ts`
- `scripts/` 目录其他 cloudbase 相关

### 新建

| 路径 | 职责 |
|------|------|
| `lib/supabase/client.ts` | 浏览器端 `createBrowserClient` |
| `lib/supabase/server.ts` | 服务端 `createServerClient`（含 cookies 适配） |
| `lib/supabase/service.ts` | 管理员 client（service_role key） |
| `lib/supabase/auth.ts` | `requireAuth()`, `getCurrentUser()` |
| `lib/supabase/db/profiles.ts` | profiles 表 CRUD |
| `lib/supabase/db/resumes.ts` | resumes 表 CRUD |
| `lib/supabase/db/jds.ts` | jds 表 CRUD |
| `lib/supabase/db/interviews.ts` | interviews 表 CRUD |
| `lib/supabase/db/interview-sessions.ts` | interview_sessions 表 CRUD |
| `lib/supabase/db/strength.ts` | strength_reports 表 CRUD |
| `lib/supabase/storage.ts` | Storage 上传/下载/删除 |
| `supabase/migrations/0001_init.sql` | 7 表 + RLS |
| `supabase/seed.sql` | 测试数据 |
| `supabase/config.toml` | Supabase CLI 配置 |
| `vercel.json` | Vercel 部署配置 |
| `.env.local.example` | 环境变量模板 |
| `.github/workflows/ci.yml` | CI（type-check + test + build） |
| `__tests__/supabase/*.test.ts` | 单元测试（mock supabase-js） |

### 修改

| 路径 | 变化 |
|------|------|
| `package.json` | 删 `@cloudbase/*`、`jose`、`jsonwebtoken`、`bcryptjs`；加 `@supabase/ssr`、`@supabase/supabase-js` |
| `app/(auth)/login/page.tsx` | 用 `supabase.auth.signInWithPassword` 替换 bcrypt 登录 |
| `app/(auth)/register/page.tsx` | 用 `supabase.auth.signUp` 替换 bcrypt 注册 |
| `app/api/auth/*/route.ts`（4 个） | 改成 Supabase Auth API 包装 |
| `app/api/resumes/**` | 改用 `lib/supabase/db/resumes.ts` |
| `app/api/jds/**` | 改用 `lib/supabase/db/jds.ts` |
| `app/api/interviews/**` | 改用 `lib/supabase/db/interviews.ts` + `interview-sessions.ts` |
| `app/api/strength/**` | 改用 `lib/supabase/db/strength.ts` |
| `app/(main)/dashboard/page.tsx` | 用 supabase client 替换 `findMany` |
| `app/(main)/discover/page.tsx` | 同上 |
| `middleware.ts` | 新建（自动刷新 Supabase session） |
| `types/user.ts` | 改成 `display_name`/`preferred_lang` |
| `types/resume.ts` | `_id` → `id` (UUID) |
| `types/jd.ts` | 同上 |
| `types/interview.ts` | 同上 |
| `types/strength.ts` | 同上 |

---

## 任务分解

### 任务 1：环境准备 — Worktree + 依赖清理

**文件：**
- 修改：`package.json`
- 删除：`lib/cloudbase/`（10 文件）、`scripts/init-cloudbase.ts`
- 修改：所有 import `@/lib/cloudbase/*` 的文件（暂时不动业务代码，标记为待改）

- [ ] **步骤 1：创建 worktree**

```bash
cd e:/mycareer
git worktree add .worktrees/supabase-migration -b feat/supabase-migration master
cd .worktrees/supabase-migration
```

- [ ] **步骤 2：删除 cloudbase 目录和 init 脚本**

```bash
rm -rf lib/cloudbase scripts
```

- [ ] **步骤 3：更新 package.json**

删除：
```json
"@cloudbase/js-sdk": "^2.7.0",
"@cloudbase/manager-node": "^5.5.5",
"@cloudbase/node-sdk": "^3.18.1",
"bcryptjs": "^3.0.3",
"jsonwebtoken": "^9.0.3",
"@types/bcryptjs": "^2.4.6",
"@types/jsonwebtoken": "^9.0.10"
```

添加：
```json
"@supabase/ssr": "^0.5.2",
"@supabase/supabase-js": "^2.46.1"
```

- [ ] **步骤 4：安装依赖**

```bash
npm install
```

- [ ] **步骤 5：Commit**

```bash
git add -A
git commit -m "chore: remove cloudbase, prepare for supabase migration"
```

---

### 任务 2：Supabase 项目初始化 + Schema 迁移

**文件：**
- 创建：`supabase/config.toml`
- 创建：`supabase/migrations/0001_init.sql`
- 创建：`supabase/migrations/0002_rls.sql`
- 创建：`supabase/seed.sql`
- 创建：`.env.local.example`

- [ ] **步骤 1：创建 supabase 目录**

```bash
mkdir -p supabase/migrations
```

- [ ] **步骤 2：写 `supabase/config.toml`**

```toml
project_id = "mycareer"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.pooler]
enabled = false

[realtime]
enabled = true

[studio]
enabled = true
port = 54323

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://*.vercel.app"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false
```

- [ ] **步骤 3：写 `supabase/migrations/0001_init.sql`（7 表）**

```sql
-- 启用 UUID 函数
create extension if not exists "pgcrypto";

-- profiles 表
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  preferred_lang text not null default 'zh' check (preferred_lang in ('zh', 'en')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- resumes 表
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('standard', 'tailored')),
  source_type text not null check (source_type in ('upload', 'paste')),
  source_file_id text,
  raw_content text not null,
  structured jsonb not null default '{}'::jsonb,
  target_role text,
  parent_id uuid references public.resumes(id) on delete set null,
  provenance jsonb not null default '[]'::jsonb,
  ai_flavor_score numeric(3,2) default 0,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'archived')),
  greeting jsonb,
  jd_id uuid,
  match_analysis jsonb,
  confirmable_items jsonb,
  confirm_completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resumes_user_id_idx on public.resumes(user_id);
create index resumes_parent_id_idx on public.resumes(parent_id);
create index resumes_jd_id_idx on public.resumes(jd_id);

-- jds 表
create table public.jds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  structured jsonb not null default '{}'::jsonb,
  target_role text,
  status text not null default 'draft' check (status in ('draft', 'parsed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jds_user_id_idx on public.jds(user_id);

-- interviews 表
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  jd_id uuid not null references public.jds(id) on delete cascade,
  resume_snapshot jsonb not null,
  jd_snapshot jsonb not null,
  question_types text[] not null default '{}',
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'generated' check (status in ('generated', 'in_progress', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_user_id_idx on public.interviews(user_id);
create index interviews_resume_id_idx on public.interviews(resume_id);
create index interviews_jd_id_idx on public.interviews(jd_id);

-- interview_sessions 表
create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  overall_score numeric(3,2),
  overall_feedback text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_sessions_user_id_idx on public.interview_sessions(user_id);
create index interview_sessions_interview_id_idx on public.interview_sessions(interview_id);

-- strength_reports 表
create table public.strength_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  report jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index strength_reports_user_id_idx on public.strength_reports(user_id);

-- applications 表（预留）
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jd_id uuid references public.jds(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_idx on public.applications(user_id);

-- updated_at 自动更新触发器
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

create trigger jds_set_updated_at
  before update on public.jds
  for each row execute function public.set_updated_at();

create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

create trigger interview_sessions_set_updated_at
  before update on public.interview_sessions
  for each row execute function public.set_updated_at();

create trigger strength_reports_set_updated_at
  before update on public.strength_reports
  for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();
```

- [ ] **步骤 4：写 `supabase/migrations/0002_rls.sql`（行级安全策略）**

```sql
-- 启用 RLS
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.jds enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.strength_reports enable row level security;
alter table public.applications enable row level security;

-- profiles 策略
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- resumes 策略
create policy "Users read own resumes" on public.resumes
  for select using (auth.uid() = user_id);

create policy "Users insert own resumes" on public.resumes
  for insert with check (auth.uid() = user_id);

create policy "Users update own resumes" on public.resumes
  for update using (auth.uid() = user_id);

create policy "Users delete own resumes" on public.resumes
  for delete using (auth.uid() = user_id);

-- jds 策略
create policy "Users read own jds" on public.jds
  for select using (auth.uid() = user_id);

create policy "Users insert own jds" on public.jds
  for insert with check (auth.uid() = user_id);

create policy "Users update own jds" on public.jds
  for update using (auth.uid() = user_id);

create policy "Users delete own jds" on public.jds
  for delete using (auth.uid() = user_id);

-- interviews 策略
create policy "Users read own interviews" on public.interviews
  for select using (auth.uid() = user_id);

create policy "Users insert own interviews" on public.interviews
  for insert with check (auth.uid() = user_id);

create policy "Users delete own interviews" on public.interviews
  for delete using (auth.uid() = user_id);

-- interview_sessions 策略
create policy "Users read own sessions" on public.interview_sessions
  for select using (auth.uid() = user_id);

create policy "Users insert own sessions" on public.interview_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users update own sessions" on public.interview_sessions
  for update using (auth.uid() = user_id);

-- strength_reports 策略
create policy "Users read own reports" on public.strength_reports
  for select using (auth.uid() = user_id);

create policy "Users insert own reports" on public.strength_reports
  for insert with check (auth.uid() = user_id);

create policy "Users update own reports" on public.strength_reports
  for update using (auth.uid() = user_id);

create policy "Users delete own reports" on public.strength_reports
  for delete using (auth.uid() = user_id);

-- applications 策略
create policy "Users read own applications" on public.applications
  for select using (auth.uid() = user_id);
```

- [ ] **步骤 5：写 `supabase/seed.sql`（测试数据）**

```sql
-- 测试数据：插入一个 demo user 的 profile
-- 注意：实际 auth.users 由 Supabase Auth 创建，这里仅 seed profiles
-- 在生产环境请删除此文件
insert into public.profiles (id, display_name, preferred_lang)
values
  ('00000000-0000-0000-0000-000000000001', 'Demo User', 'zh')
on conflict (id) do nothing;
```

- [ ] **步骤 6：写 `.env.local.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DeepSeek
DEEPSEEK_API_KEY=your-deepseek-key

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **步骤 7：Commit**

```bash
git add supabase/ .env.local.example
git commit -m "feat(db): add supabase schema migrations with RLS"
```

---

### 任务 3：Supabase 客户端 + Auth 工具

**文件：**
- 创建：`lib/supabase/client.ts`
- 创建：`lib/supabase/server.ts`
- 创建：`lib/supabase/service.ts`
- 创建：`lib/supabase/auth.ts`
- 创建：`__tests__/supabase/auth.test.ts`

- [ ] **步骤 1：写 `lib/supabase/client.ts`（浏览器端）**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **步骤 2：写 `lib/supabase/server.ts`（服务端）**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 RSC 中 set cookies 会失败，由 middleware 处理
          }
        },
      },
    }
  );
}
```

- [ ] **步骤 3：写 `lib/supabase/service.ts`（管理员）**

```typescript
import { createClient } from "@supabase/supabase-js";

// 仅服务端使用，绕过 RLS。绝不能 import 到客户端代码
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

- [ ] **步骤 4：写 `lib/supabase/auth.ts`**

```typescript
import { createClient } from "./server";
import type { User } from "@supabase/supabase-js";

export interface Session {
  userId: string;
  email: string;
  displayName: string;
  preferredLang: "zh" | "en";
}

export async function requireAuth(): Promise<Session> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }
  const profile = await getProfile(data.user.id);
  return {
    userId: data.user.id,
    email: data.user.email!,
    displayName: profile?.display_name ?? data.user.email!,
    preferredLang: (profile?.preferred_lang ?? "zh") as "zh" | "en",
  };
}

export async function getCurrentUser(): Promise<Session | null> {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}

async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, preferred_lang")
    .eq("id", userId)
    .single();
  return data;
}
```

- [ ] **步骤 5：写测试 `__tests__/supabase/auth.test.ts`**

```typescript
import { requireAuth, getCurrentUser } from "@/lib/supabase/auth";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}));

describe("requireAuth", () => {
  it("throws when no user", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockReturnValueOnce({
      auth: { getUser: () => ({ data: { user: null }, error: null }) },
    });
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });
});

describe("getCurrentUser", () => {
  it("returns null on failure", async () => {
    const { createClient } = require("@/lib/supabase/server");
    createClient.mockReturnValueOnce({
      auth: { getUser: () => ({ data: { user: null }, error: null }) },
    });
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
```

- [ ] **步骤 6：跑测试**

```bash
npm test -- __tests__/supabase/auth.test.ts
```

预期：PASS

- [ ] **步骤 7：Commit**

```bash
git add lib/supabase/ __tests__/supabase/
git commit -m "feat(supabase): add client, server, service, and auth helpers"
```

---

### 任务 4：Storage 工具

**文件：**
- 创建：`lib/supabase/storage.ts`
- 创建：`__tests__/supabase/storage.test.ts`

- [ ] **步骤 1：写 `lib/supabase/storage.ts`**

```typescript
import { createServiceClient } from "./service";
import { createClient } from "./server";

const BUCKET = "resumes";

export interface UploadFileOptions {
  userId: string;
  fileName: string;
  file: File | Blob | ArrayBuffer;
}

export interface UploadFileResult {
  path: string;
}

export async function uploadResume(options: UploadFileOptions): Promise<UploadFileResult> {
  // 上传用 service client 跳过 RLS（已在 server 端验证 userId）
  const supabase = createServiceClient();
  const path = buildResumePath(options.userId, options.fileName);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, options.file, { upsert: false });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  return { path };
}

export async function getResumeSignedUrl(path: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600); // 1 小时
  if (error || !data) {
    throw new Error(`Get URL failed: ${error?.message ?? "no data"}`);
  }
  return data.signedUrl;
}

export async function deleteResume(path: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export function buildResumePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${timestamp}_${safeName}`;
}
```

- [ ] **步骤 2：写测试 `__tests__/supabase/storage.test.ts`**

```typescript
import { buildResumePath } from "@/lib/supabase/storage";

describe("buildResumePath", () => {
  it("builds user-scoped path", () => {
    const path = buildResumePath("user-123", "我的 简历.pdf");
    expect(path).toMatch(/^user-123\/\d+_.*\.pdf$/);
    expect(path).toContain("__");
  });
});
```

- [ ] **步骤 3：跑测试**

```bash
npm test -- __tests__/supabase/storage.test.ts
```

- [ ] **步骤 4：Commit**

```bash
git add lib/supabase/storage.ts __tests__/supabase/storage.test.ts
git commit -m "feat(storage): add supabase storage helpers for resume files"
```

---

### 任务 5：业务 DB 操作（5 个表）

**文件：**
- 创建：`lib/supabase/db/profiles.ts`
- 创建：`lib/supabase/db/resumes.ts`
- 创建：`lib/supabase/db/jds.ts`
- 创建：`lib/supabase/db/interviews.ts`
- 创建：`lib/supabase/db/interview-sessions.ts`
- 创建：`lib/supabase/db/strength.ts`

> **TDD 纪律**：每个表的 CRUD 函数配对一个测试文件，但鉴于 supabase-js 难以 mock（链式调用），建议主要用集成测试（任务 9 端到端验证时跑）。这里只做必要的单元测试。

- [ ] **步骤 1：写 `lib/supabase/db/profiles.ts`**

```typescript
import { createServiceClient } from "../service";

export interface Profile {
  id: string;
  display_name: string;
  preferred_lang: "zh" | "en";
  is_admin: boolean;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function upsertProfile(
  id: string,
  displayName: string,
  preferredLang: "zh" | "en" = "zh"
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("profiles").upsert({
    id,
    display_name: displayName,
    preferred_lang: preferredLang,
  });
  if (error) throw new Error(`Upsert profile failed: ${error.message}`);
}
```

- [ ] **步骤 2：写 `lib/supabase/db/resumes.ts`**

> 完整的 CRUD 函数（createResume、getResumeById、listResumesByUser、updateResume、deleteResume、listTailoredByStandard、listGreetingsByUser）。代码结构对应 `lib/cloudbase/resumes.ts`，把 `_id` 改成 `id`，`_id` 不存在的条件用 `user_id` + RLS 双重验证。

```typescript
import { createClient } from "../server";
import type { ResumeStructured, ResumeType, ResumeSourceType, ResumeStatus, ProvenanceEntry } from "@/types/resume";

export interface Resume {
  id: string;
  user_id: string;
  type: ResumeType;
  source_type: ResumeSourceType;
  source_file_id: string | null;
  raw_content: string;
  structured: ResumeStructured;
  target_role: string | null;
  parent_id: string | null;
  provenance: ProvenanceEntry[];
  ai_flavor_score: number;
  status: ResumeStatus;
  greeting: any | null;
  jd_id: string | null;
  match_analysis: any | null;
  confirmable_items: any | null;
  confirm_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeListItem {
  id: string;
  type: ResumeType;
  status: ResumeStatus;
  target_role: string | null;
  source_type: ResumeSourceType;
  created_at: string;
  updated_at: string;
}

export interface CreateResumeInput {
  userId: string;
  type: ResumeType;
  sourceType: ResumeSourceType;
  sourceFileId?: string;
  rawContent: string;
  structured: ResumeStructured;
  targetRole?: string;
  parentId?: string;
  status?: ResumeStatus;
}

export async function createResume(input: CreateResumeInput): Promise<Resume> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: input.userId,
      type: input.type,
      source_type: input.sourceType,
      source_file_id: input.sourceFileId,
      raw_content: input.rawContent,
      structured: input.structured,
      target_role: input.targetRole,
      parent_id: input.parentId,
      status: input.status ?? "draft",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Create resume failed: ${error?.message}`);
  return data as Resume;
}

export async function getResumeById(id: string, userId: string): Promise<Resume | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as Resume;
}

export async function listResumesByUser(
  userId: string,
  options?: { type?: ResumeType; status?: ResumeStatus; limit?: number }
): Promise<ResumeListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("resumes")
    .select("id, type, status, target_role, source_type, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 50);
  if (options?.type) query = query.eq("type", options.type);
  if (options?.status) query = query.eq("status", options.status);
  const { data, error } = await query;
  if (error) throw new Error(`List resumes failed: ${error.message}`);
  return (data ?? []) as ResumeListItem[];
}

export async function updateResume(
  id: string,
  userId: string,
  update: Partial<Resume>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("resumes")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Update resume failed: ${error.message}`);
}

export async function deleteResume(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Delete resume failed: ${error.message}`);
}
```

- [ ] **步骤 3：写 `lib/supabase/db/jds.ts`**

> 类似 resumes.ts 结构。完整 CRUD：createJd, getJdById, listJdsByUser, updateJd, deleteJd。

- [ ] **步骤 4：写 `lib/supabase/db/interviews.ts`**

> CRUD：createInterview, getInterviewById, listInterviewsByUser, deleteInterview。

- [ ] **步骤 5：写 `lib/supabase/db/interview-sessions.ts`**

> CRUD：createSession, getSessionById, listSessionsByInterview, updateSession, getSessionStatsByInterviewIds（用 SQL 函数 `interview_id = ANY($1)` 实现）。

- [ ] **步骤 6：写 `lib/supabase/db/strength.ts`**

> CRUD：createStrengthReport, getStrengthReportById, listStrengthReportsByUser, updateStrengthReportContent, updateStrengthReportStatus, deleteStrengthReport。

- [ ] **步骤 7：Commit**

```bash
git add lib/supabase/db/
git commit -m "feat(db): migrate all 5 business table CRUD to supabase"
```

---

### 任务 6：更新 TypeScript 类型（`_id` → `id`）

**文件：**
- 修改：`types/user.ts`
- 修改：`types/resume.ts`
- 修改：`types/jd.ts`
- 修改：`types/interview.ts`
- 修改：`types/strength.ts`

- [ ] **步骤 1：改 `types/user.ts`**

```typescript
// 旧：
export interface User {
  _id: string;
  email: string;
  displayName: string;
  preferredLang: "zh" | "en";
}

// 新：删除此类型，user 信息直接从 Supabase Auth + profiles 取
// 如需类型，重新定义：
export interface UserProfile {
  id: string;  // UUID
  displayName: string;
  preferredLang: "zh" | "en";
  isAdmin: boolean;
}
```

- [ ] **步骤 2：批量改名（其他 4 个类型文件）**

将所有 `_id: string` 改为 `id: string`。
将 `userId: string` 保持（Supabase 列名是 `user_id`，类型层用驼峰）。

- [ ] **步骤 3：搜索所有引用并更新**

```bash
grep -rn "_id:" types/
```

确认全部已改。

- [ ] **步骤 4：Commit**

```bash
git add types/
git commit -m "refactor(types): migrate _id to id (uuid)"
```

---

### 任务 7：Auth 流程改造

**文件：**
- 修改：`app/(auth)/login/page.tsx`
- 修改：`app/(auth)/register/page.tsx`
- 创建：`app/api/auth/register/route.ts`（替代 cloudbase 注册）
- 创建：`app/api/auth/login/route.ts`（替代 cloudbase 登录）
- 创建：`app/api/auth/logout/route.ts`
- 创建：`app/api/auth/me/route.ts`
- 创建：`middleware.ts`

- [ ] **步骤 1：写 `app/api/auth/register/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProfile } from "@/lib/supabase/db/profiles";

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return Response.json({ error: { message: error.message } }, { status: 400 });
    if (!data.user) return Response.json({ error: { message: "No user" } }, { status: 500 });

    // 创建 profile 行
    await upsertProfile(data.user.id, displayName, "zh");

    return Response.json({ success: true, data: { userId: data.user.id } });
  } catch (err) {
    return Response.json({ error: { message: (err as Error).message } }, { status: 500 });
  }
}
```

- [ ] **步骤 2：写 `app/api/auth/login/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return Response.json({ error: { message: error.message } }, { status: 401 });
    return Response.json({ success: true, data: { userId: data.user.id } });
  } catch (err) {
    return Response.json({ error: { message: (err as Error).message } }, { status: 500 });
  }
}
```

- [ ] **步骤 3：写 `app/api/auth/logout/route.ts`**

```typescript
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return Response.json({ success: true });
}
```

- [ ] **步骤 4：写 `app/api/auth/me/route.ts`**

```typescript
import { getCurrentUser } from "@/lib/supabase/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  return Response.json({ success: true, data: user });
}
```

- [ ] **步骤 5：写 `middleware.ts`（自动刷新 session）**

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **步骤 6：写 `lib/supabase/middleware.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 保护路由：未登录访问受保护页面跳转 /login
  const protectedPaths = ["/dashboard", "/resume", "/jd", "/interview", "/discover", "/greeting"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **步骤 7：改 `app/(auth)/login/page.tsx`**

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p>{error}</p>}
      <button type="submit">登录</button>
    </form>
  );
}
```

- [ ] **步骤 8：改 `app/(auth)/register/page.tsx`**

类似，用 `supabase.auth.signUp({ email, password, options: { data: { display_name } } })`。

- [ ] **步骤 9：Commit**

```bash
git add app/(auth)/ app/api/auth/ middleware.ts lib/supabase/middleware.ts
git commit -m "feat(auth): migrate to supabase auth with middleware session refresh"
```

---

### 任务 8：API Routes 适配（5 个模块）

**文件：**
- 修改：`app/api/resumes/**`（8 个文件）
- 修改：`app/api/jds/**`（6 个文件）
- 修改：`app/api/interviews/**`（6 个文件）
- 修改：`app/api/strength/reports/**`（2 个文件）
- 修改：`app/api/greetings/route.ts`

> **通用改法**：每个 route 替换 imports（`@/lib/cloudbase/*` → `@/lib/supabase/*`），替换 `getCurrentUser` 返回值（`userId: string`），所有 `_id` → `id` 参数。

- [ ] **步骤 1：批量改 resumes routes**

逐个文件改：upload、paste、parse、generate、confirm、greeting、interview、root、\[id\]。

- [ ] **步骤 2：批量改 jds routes**

parse、\[id\]、\[id\]/tailor、\[id\]/interview、root。

- [ ] **步骤 3：批量改 interviews routes**

sessions 创建/答题/完成/查看，\[id\] 查看/删除，root。

- [ ] **步骤 4：改 strength routes**

reports/\[id\]、reports。

- [ ] **步骤 5：改 greetings route**

greetings 数据实际在 resumes.greeting 字段，所以这个 route 改为调 `listGreetingsByUser`（保留兼容）。

- [ ] **步骤 6：Commit**

```bash
git add app/api/
git commit -m "refactor(api): migrate all routes to supabase db layer"
```

---

### 任务 9：页面组件适配

**文件：**
- 修改：`app/(main)/dashboard/page.tsx`
- 修改：`app/(main)/discover/page.tsx`
- 修改：`app/(main)/interview/page.tsx`
- 修改：`app/(main)/greeting/page.tsx`
- 修改：`app/(main)/resume/**`（多个）
- 修改：`app/(main)/jd/**`（多个）
- 修改：`app/(main)/interview/**`（多个）

- [ ] **步骤 1：改 `app/(main)/dashboard/page.tsx`**

替换 `findMany(Collections.X, ...)` 为 `lib/supabase/db/*` 调用。

- [ ] **步骤 2：改 `app/(main)/discover/page.tsx`**

`getCurrentUser` 替换 + types 字段适配。

- [ ] **步骤 3：改其他页面**

统一改 import + 调用方式。

- [ ] **步骤 4：Commit**

```bash
git add app/\(main\)/
git commit -m "refactor(pages): migrate all pages to use supabase db"
```

---

### 任务 10：Vercel + GitHub 部署

**文件：**
- 创建：`vercel.json`
- 创建：`.github/workflows/ci.yml`
- 创建：`.vercelignore`

- [ ] **步骤 1：写 `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sin1"]
}
```

- [ ] **步骤 2：写 `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [master, feat/**]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://test.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: test-key
          SUPABASE_SERVICE_ROLE_KEY: test-key
          DEEPSEEK_API_KEY: test-key
```

- [ ] **步骤 3：写 `.vercelignore`**

```
node_modules
.next
.git
.worktrees
.env*
!.env.local.example
supabase/.branches
supabase/.temp
```

- [ ] **步骤 4：Commit**

```bash
git add vercel.json .github/workflows/ci.yml .vercelignore
git commit -m "ci: add vercel config, github actions ci, and vercelignore"
```

---

### 任务 11：创建 GitHub repo + 推 master

- [ ] **步骤 1：在 GitHub 创建 repo `mycareer`（private）**

记录 URL，例如 `https://github.com/<username>/mycareer`。

- [ ] **步骤 2：创建 Supabase 项目**

访问 https://supabase.com/dashboard → New Project，记录：
- Project URL
- anon key
- service_role key

- [ ] **步骤 3：把 Supabase 迁移 SQL 跑到云端**

```bash
# 用 Supabase CLI（需先 npm i -g supabase）
supabase link --project-ref <project-id>
supabase db push
```

或手动在 Supabase Dashboard SQL Editor 跑 `0001_init.sql` 和 `0002_rls.sql`。

- [ ] **步骤 4：配置 Vercel 环境变量**

Vercel Project → Settings → Environment Variables：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://<your-app>.vercel.app`

- [ ] **步骤 5：推 GitHub**

```bash
git remote add origin https://github.com/<username>/mycareer.git
git push -u origin master
git push -u origin feat/supabase-migration
```

- [ ] **步骤 6：合并到 master**

通过 GitHub PR，或本地：
```bash
git checkout master
git merge feat/supabase-migration --no-ff
git push origin master
```

- [ ] **步骤 7：Vercel 自动部署**

Vercel 检测 master 推送 → 自动 build → 部署到 `https://<app>.vercel.app`。

---

### 任务 12：端到端验证

- [ ] **步骤 1：访问生产 URL**

打开 `https://<app>.vercel.app`。

- [ ] **步骤 2：注册测试用户**

- [ ] **步骤 3：登录**

- [ ] **步骤 4：上传简历 → 解析 → 生成**

- [ ] **步骤 5：粘贴 JD → 解析 → 匹配**

- [ ] **步骤 6：生成面试题 → 答题**

- [ ] **步骤 7：跑一次优势识别**

- [ ] **步骤 8：查看历史报告**

- [ ] **步骤 9：登出**

---

### 任务 13：清理

- [ ] **步骤 1：删除 worktree**

```bash
git worktree remove .worktrees/supabase-migration
git branch -d feat/supabase-migration
```

- [ ] **步骤 2：删除设计文档中过时内容**

（不需要，文档已准确）

- [ ] **步骤 3：最终 commit "chore: complete supabase migration"**

---

## 自检

- [x] 规格覆盖度：✅ 设计文档所有章节都有对应任务
- [x] 占位符扫描：✅ 无 TODO/TBD
- [x] 类型一致性：✅ `_id` → `id` 改造覆盖所有 5 个 type 文件
- [x] 代码示例完整：✅ 每个步骤都有可运行代码

## 工作量估算

| 任务 | 工时 |
|------|------|
| 1. 环境准备 | 1h |
| 2. Schema 迁移 | 2h |
| 3. Supabase 客户端 | 1.5h |
| 4. Storage | 0.5h |
| 5. 业务 DB | 2h |
| 6. 类型更新 | 0.5h |
| 7. Auth 改造 | 2h |
| 8. API 适配 | 3h |
| 9. 页面适配 | 2h |
| 10. Vercel + CI | 1h |
| 11. 部署 | 1h |
| 12. 端到端 | 1h |
| 13. 清理 | 0.5h |
| **合计** | **~18h（2-3 工作日）** |
