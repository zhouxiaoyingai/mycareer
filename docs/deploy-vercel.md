# SmartCareer - Vercel 部署指南

> 适用:从 CloudBase HTTP 云函数迁移至 Vercel + Supabase 后的一键部署。

## 0. 前提

- 代码在 `master` 分支已通过 `tsc --noEmit` + `next build` + `jest`
- Supabase 项目已就绪 (URL / Anon Key / Service Role Key)
- DeepSeek API Key 已获取
- Vercel 账号已绑定 GitHub

## 1. Vercel 项目创建

1. 打开 https://vercel.com/new
2. 导入仓库 `zxyge/mycareer` (或当前 git remote)
3. Framework Preset: **Next.js** (自动识别)
4. Root Directory: `./`
5. Build & Output Settings: 保持默认
   - Build Command: `next build` (来自 `vercel.json`)
   - Install Command: `npm install`
   - Output: `.next`

## 2. 环境变量

在 Vercel → Project Settings → Environment Variables 添加以下 6 个变量
(Production / Preview / Development 都勾选):

| 变量 | 必填 | 用途 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 浏览器端 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 服务端 bypass RLS,仅服务器用 |
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek LLM 调用 |
| `NEXT_PUBLIC_APP_URL` | ✅ | 生产域名,如 `https://smartcareer.vercel.app` |
| `COOKIE_DOMAIN` | ⬜ | 自定义域名时设置,默认 Vercel 子域可省略 |

参考 `.env.local.example`。

## 3. Supabase 准备

### 3.1 创建项目

1. https://supabase.com/dashboard → New Project
2. Region: 选 **Singapore** (ap-southeast-1,与 Vercel `sin1` 同区,降低延迟)
3. 记下 Project URL 和 anon/service_role key → 填入 Vercel

### 3.2 执行 SQL 迁移

在 Supabase SQL Editor 依次执行:

```
supabase/migrations/0001_init.sql        # 表 + 索引
supabase/migrations/0002_rls.sql         # RLS 策略
supabase/migrations/0003_seed_dev.sql    # (可选) 开发种子数据
```

### 3.3 Auth 配置

- Authentication → URL Configuration → Site URL: `https://smartcareer.vercel.app`
- Redirect URLs: 添加 `https://smartcareer.vercel.app/auth/callback`

## 4. 触发部署

```bash
git push origin master
```

或在 Vercel 控制点 **Deploy**。

## 5. Smoke Test (部署后)

按 `docs/smoke-test.md` 跑下列 7 个 curl 检查:

1. `GET /api/auth/me` 返回 401 (未登录)
2. `POST /api/auth/register` 注册测试用户
3. `POST /api/auth/login` 登录拿 cookie
4. `GET /api/auth/me` 携带 cookie 返回 200 + user 信息
5. `GET /` 返回 200 HTML
6. `GET /login` 返回 200 HTML
7. `POST /api/auth/logout` 清除 cookie

## 6. 回滚

Vercel → Deployments → 找到上一个 Production 部署 → **Promote to Production**。
