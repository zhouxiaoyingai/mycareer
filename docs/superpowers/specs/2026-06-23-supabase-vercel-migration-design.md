# mycareer: CloudBase → Supabase + Vercel 迁移设计

> 日期：2026-06-23
> 状态：草案（待用户批准）

## 1. 目标

将 mycareer 项目的技术栈从「CloudBase（数据库/鉴权/存储） + 本地/自部署」迁移到「Supabase（数据库/鉴权/存储） + Vercel 部署」，**从零开始**，不保留 CloudBase 代码。

## 2. 范围

### 2.1 保留

- Next.js 14 App Router
- next-intl 多语言
- Tailwind CSS + shadcn/ui 组件
- TypeScript
- 测试栈（Jest + Testing Library）
- 所有前端页面组件（仅替换数据获取层）
- AI 集成（DeepSeek）
- 优势识别功能的业务逻辑

### 2.2 删除

- 整个 `lib/cloudbase/` 目录（10 个文件）
- `jose`、`jsonwebtoken`、`bcryptjs`（鉴权被 Supabase 取代）
- `@cloudbase/js-sdk`、`@cloudbase/node-sdk`、`@cloudbase/manager-node`
- `scripts/init-cloudbase.ts`

### 2.3 新增

- `lib/supabase/` 目录
  - `client.ts`（浏览器端，createBrowserClient）
  - `server.ts`（服务端，createServerClient + cookies）
  - `service.ts`（管理员，service_role key）
  - `auth.ts`（登录/登出/会话辅助）
  - `db/` 业务表操作（resumes.ts, jds.ts, interviews.ts, strength.ts, profiles.ts）
  - `storage.ts`（Supabase Storage 包装）
- `supabase/` 目录
  - `migrations/` SQL 迁移文件
  - `seed.sql` 测试数据
- `.env.local.example`（Supabase URL/key 模板）
- `vercel.json`（部署配置）

## 3. 架构

```
┌─────────────────────────────────────────┐
│  Vercel (Next.js App Router)            │
│  ┌────────────────────────────────────┐ │
│  │  Edge / Node Runtime               │ │
│  │  - 页面 (RSC)                       │ │
│  │  - API Routes (/api/*)              │ │
│  │    - 调 supabase-js (服务端)        │ │
│  │    - 调 DeepSeek API                │ │
│  └────────────────────────────────────┘ │
└────────────┬────────────────────────────┘
             │ HTTPS
   ┌─────────┴──────────┐
   ↓                    ↓
┌────────┐         ┌─────────┐
│Supabase│         │ DeepSeek│
│  Auth  │         │   API   │
│  DB    │         └─────────┘
│Storage │
└────────┘
```

## 4. 数据库 Schema（7 表 — 精简后）

> **审查依据**：基于 `lib/cloudbase/*.ts` 实际使用情况，过度设计的表已删除（`greetings` 是死代码，`career_paths`/`jd_analyses` 未引用）。

| # | 表 | 来源 | 关键字段 |
|---|----|------|---------|
| 1 | `profiles` | 替代 `users` 表 | `id UUID PK REFERENCES auth.users`, `display_name`, `preferred_lang`, `is_admin BOOLEAN DEFAULT FALSE` |
| 2 | `resumes` | 直接映射 | `id`, `user_id`, `type`, `source_type`, `source_file_id`, `raw_content`, `structured JSONB`, `target_role`, `parent_id`, `provenance JSONB`, `ai_flavor_score`, `status`, `greeting JSONB`, `jd_id`, `match_analysis JSONB`, `confirmable_items JSONB`, `confirm_completed` |
| 3 | `jds` | 直接映射 | `id`, `user_id`, `raw_text`, `structured JSONB`, `target_role`, `status` |
| 4 | `interviews` | 直接映射 | `id`, `user_id`, `resume_id`, `jd_id`, `resume_snapshot JSONB`, `jd_snapshot JSONB`, `question_types TEXT[]`, `questions JSONB`, `status` |
| 5 | `interview_sessions` | 直接映射 | `id`, `user_id`, `interview_id`, `answers JSONB`, `overall_score`, `overall_feedback`, `status` |
| 6 | `strength_reports` | 直接映射 | `id`, `user_id`, `answers JSONB`, `report JSONB`, `status` |
| 7 | `applications` | 预留（暂不实装） | `id`, `user_id`, `jd_id`, `status`, `created_at` |

**关键设计**：
- **不创建 `users` 表** — Supabase Auth 内置 `auth.users` 取代
- **`profiles.is_admin`** 字段保留位置（用户选择"暂不实现"），RLS 策略默认不豁免
- 所有业务表都有 `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- 启用 RLS（行级安全策略）：`auth.uid() = user_id`
- 主键用 `id UUID DEFAULT gen_random_uuid()` 替代 MongoDB 的 `_id`
- 时间戳用 `timestamptz DEFAULT now()` 替代 `Date`
- 数组字段用 `TEXT[]` 或 `JSONB`（PostgreSQL 原生支持）

## 5. 鉴权设计

### 5.1 用户登录流程

```
用户输入邮箱+密码
  → supabase.auth.signInWithPassword()
  → Supabase 返回 session (access_token + refresh_token)
  → Next.js 写 cookies
  → 重定向到 /dashboard
```

### 5.2 服务端获取用户

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)),
      },
    }
  );
}
```

### 5.3 API Route 鉴权

```typescript
// lib/supabase/auth.ts
export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return { userId: user.id, email: user.email! };
}
```

## 6. RLS 策略示例

```sql
-- 用户只能读自己的简历
CREATE POLICY "Users read own resumes" ON resumes
  FOR SELECT USING (auth.uid() = user_id);

-- 用户能插入自己的简历
CREATE POLICY "Users insert own resumes" ON resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## 7. 部署设计

### 7.1 Vercel 项目设置

- **Framework Preset**: Next.js
- **Build Command**: `next build`（默认）
- **Output Directory**: `.next`（默认）
- **Node Version**: 20.x

### 7.2 环境变量（Vercel + .env.local）

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 浏览器端 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端管理员 key（仅服务端） |
| `DEEPSEEK_API_KEY` | AI 调用 |

### 7.3 GitHub 集成

- Vercel 连接 GitHub repo
- 推 master → 自动部署
- 推 PR → 预览部署

## 8. 实施步骤

| 阶段 | 内容 | 工时 |
|------|------|------|
| 1. 准备 | 创建 GitHub repo / Supabase 项目 / Vercel 项目 | 1h |
| 2. Schema | 写 9 个表 + RLS 迁移 SQL | 2h |
| 3. 依赖 | 替换 package.json：装 @supabase/ssr, @supabase/supabase-js；删 cloudbase/jose | 1h |
| 4. lib/supabase | 写 client/server/service + db/* + storage | 3h |
| 5. Auth | 改造登录/注册/登出页面 + middleware | 2h |
| 6. API 适配 | 改写 9 个 /api/* routes 用 supabase | 3h |
| 7. 前端适配 | 替换所有 useEffect fetch + 状态管理 | 2h |
| 8. 端到端 | 完整 dev 测试 + 修复 | 2h |
| 9. 部署 | 推 GitHub + Vercel 部署 + smoke test | 1h |
| **合计** | | **~17h**（2-3 个工作日） |

## 9. 风险与回退

| 风险 | 缓解 |
|------|------|
| Supabase Auth 限制（如邮件验证） | 开发期用 magic link；生产期开邮件服务 |
| Vercel Serverless 30s 超时 | AI 生成用流式或 webhook 异步 |
| RLS 策略写错导致数据泄露 | 测试用两个账号验证 |
| Cold start 慢 | 启用 Vercel Edge Runtime 优化冷启动 |

## 10. 待用户确认

- [ ] Schema 9 个表是否完整？是否需要增加 / 删除？
- [ ] RLS 策略是否需要更复杂（如管理员后台）？
- [ ] 是否有管理员角色需求？
- [ ] 国际化（i18n）是否需要调整（zh-CN/en-US）？
- [ ] 是否需要 CI/CD（如 GitHub Actions 跑测试）？
