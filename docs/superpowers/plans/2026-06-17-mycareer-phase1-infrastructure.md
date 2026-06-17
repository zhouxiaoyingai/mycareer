# MyCareer 阶段 1：项目基础设施 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭建 MyCareer 项目基础设施，包含 Next.js 项目初始化、CloudBase 数据库与认证集成、DeepSeek AI 客户端、响应式布局、中英双语 i18n，产出可注册登录的可用应用骨架。

**架构：** 单体 Next.js App Router 应用，API Routes 作为后端，CloudBase 提供 NoSQL 数据库与邮箱密码认证，DeepSeek 作为 AI 服务，部署到 EdgeOne Pages。

**技术栈：** Next.js 14+ / TypeScript / Tailwind CSS / shadcn/ui / 腾讯云 CloudBase / DeepSeek API / next-intl

**规格来源：** `docs/superpowers/specs/2026-06-17-mycareer-design.md`

---

## 文件结构

```
mycareer/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                  # 认证布局
│   │   ├── login/page.tsx              # 登录页
│   │   └── register/page.tsx           # 注册页
│   ├── (main)/
│   │   ├── layout.tsx                  # 主功能布局（含导航）
│   │   └── dashboard/page.tsx          # 仪表盘
│   ├── api/
│   │   └── auth/
│   │       ├── register/route.ts       # 注册 API
│   │       ├── login/route.ts          # 登录 API
│   │       ├── logout/route.ts         # 登出 API
│   │       └── me/route.ts             # 当前用户 API
│   ├── layout.tsx                      # 根布局
│   ├── page.tsx                        # 首页（重定向）
│   └── globals.css                     # 全局样式
├── lib/
│   ├── cloudbase/
│   │   ├── client.ts                   # CloudBase 初始化
│   │   ├── db.ts                       # 数据库访问层
│   │   └── auth.ts                     # 认证工具
│   ├── ai/
│   │   └── deepseek.ts                 # DeepSeek 客户端
│   ├── i18n/
│   │   ├── config.ts                   # i18n 配置
│   │   └── messages/                   # 翻译文件
│   │       ├── zh.json
│   │       └── en.json
│   └── utils/
│       ├── cn.ts                       # className 合并
│       ├── response.ts                 # 统一 API 响应
│       └── validation.ts               # 输入校验
├── components/
│   ├── ui/                             # shadcn/ui 组件
│   └── layout/
│       ├── sidebar.tsx                 # PC 侧边栏
│       ├── mobile-nav.tsx             # 手机底部导航
│       └── header.tsx                  # 顶部栏
├── types/
│   ├── user.ts                         # 用户类型
│   └── api.ts                          # API 类型
├── middleware.ts                       # 认证中间件
├── i18n.ts                             # next-intl 配置
├── jest.config.ts                      # Jest 配置
├── jest.setup.ts                       # Jest 初始化
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                          # 环境变量
```

---

## 任务 1：项目初始化与依赖安装

**文件：**
- 创建：`package.json`（由 create-next-app 生成）
- 创建：`next.config.js`
- 创建：`.env.local`
- 创建：`.env.example`

- [ ] **步骤 1：使用 create-next-app 初始化项目**

在 `e:\mycareer` 目录下初始化 Next.js 项目（保留现有文件）：

```bash
cd e:\mycareer
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias "@/*" --use-npm --no-eslint --yes
```

如果目录非空，选择忽略现有文件继续。

- [ ] **步骤 2：安装核心依赖**

```bash
npm install @cloudbase/js-sdk@^2 next-intl@^3 zod@^3 @hookform/resolvers@^3 react-hook-form@^7
```

- [ ] **步骤 3：安装 shadcn/ui 及其依赖**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react tailwindcss-animate
npx shadcn-ui@latest init -y
npx shadcn-ui@latest add button input card label dropdown-menu -y
```

- [ ] **步骤 4：安装开发依赖**

```bash
npm install -D @types/node jest@^29 jest-environment-jsdom@^29 @testing-library/react@^14 @testing-library/jest-dom@^6 @testing-library/user-event@^14 ts-jest@^29 @types/jest@^29
```

- [ ] **步骤 5：创建环境变量文件**

创建 `.env.local`：

```bash
# CloudBase
CLOUDBASE_ENV_ID=your_cloudbase_env_id
CLOUDBASE_SECRET_ID=your_cloudbase_secret_id
CLOUDBASE_SECRET_KEY=your_cloudbase_secret_key

# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

创建 `.env.example`（同上但无真实值）。

- [ ] **步骤 6：更新 .gitignore**

在 `.gitignore` 末尾追加：

```
# 环境变量
.env.local
.env.*.local

# 简历助手 Skill（已有，不纳入版本控制）
简历助手/
awesome-design-md/
.claude/
```

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "chore: 初始化 Next.js 项目与依赖"
```

---

## 任务 2：Tailwind 主题配置

**文件：**
- 修改：`tailwind.config.ts`
- 修改：`app/globals.css`

- [ ] **步骤 1：配置 Tailwind 主题（浅色友好风）**

修改 `tailwind.config.ts`：

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **步骤 2：配置全局 CSS 变量**

修改 `app/globals.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* 浅色友好风 - Notion/Airbnb 启发 */
    --background: 0 0% 100%;
    --foreground: 0 0% 12%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 12%;
    --primary: 217 100% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 60 10% 96%;
    --secondary-foreground: 0 0% 12%;
    --muted: 60 10% 96%;
    --muted-foreground: 0 0% 42%;
    --accent: 60 10% 96%;
    --accent-foreground: 0 0% 12%;
    --destructive: 14 100% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 60 6% 90%;
    --input: 60 6% 90%;
    --ring: 217 100% 50%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

- [ ] **步骤 3：验证 Tailwind 配置生效**

运行：`npm run dev`
预期：访问 http://localhost:3000 能看到默认页面，无样式错误。

- [ ] **步骤 4：Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "style: 配置浅色友好风主题"
```

---

## 任务 3：类型定义

**文件：**
- 创建：`types/user.ts`
- 创建：`types/api.ts`

- [ ] **步骤 1：创建用户类型**

创建 `types/user.ts`：

```typescript
export interface User {
  _id: string;
  email: string;
  displayName: string;
  preferredLang: "zh" | "en";
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  userId: string;
  email: string;
  displayName: string;
  preferredLang: "zh" | "en";
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
```

- [ ] **步骤 2：创建 API 类型**

创建 `types/api.ts`：

```typescript
export interface ApiSuccessResponse<T> {
  data: T;
  error?: never;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  data?: never;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "AI_API_ERROR"
  | "AI_PARSE_ERROR"
  | "FILE_UPLOAD_ERROR"
  | "HALLUCINATION_DETECTED"
  | "INTERNAL_ERROR";
```

- [ ] **步骤 3：Commit**

```bash
git add types/
git commit -m "feat: 添加用户与 API 类型定义"
```

---

## 任务 4：CloudBase 客户端集成

**文件：**
- 创建：`lib/cloudbase/client.ts`
- 创建：`lib/cloudbase/db.ts`
- 创建：`lib/utils/cn.ts`
- 创建：`lib/utils/response.ts`
- 创建：`lib/utils/validation.ts`

- [ ] **步骤 1：创建 CloudBase 初始化客户端**

创建 `lib/cloudbase/client.ts`：

```typescript
import cloudbase from "@cloudbase/js-sdk";

let app: cloudbase.App | null = null;

export function getCloudBaseApp(): cloudbase.App {
  if (app) {
    return app;
  }

  const envId = process.env.CLOUDBASE_ENV_ID;
  if (!envId) {
    throw new Error("CLOUDBASE_ENV_ID 环境变量未设置");
  }

  app = cloudbase.init({
    env: envId,
  });

  return app;
}

export function getDb(): cloudbase.database.Database {
  return getCloudBaseApp().database();
}

export function getAuth(): cloudbase.auth.Auth {
  return getCloudBaseApp().auth();
}
```

- [ ] **步骤 2：创建数据库访问层**

创建 `lib/cloudbase/db.ts`：

```typescript
import { getDb } from "./client";

export const Collections = {
  USERS: "users",
  RESUMES: "resumes",
  JDS: "jds",
  GREETINGS: "greetings",
  INTERVIEWS: "interviews",
  APPLICATIONS: "applications",
} as const;

export async function insertOne<T extends Record<string, unknown>>(
  collection: string,
  doc: T
): Promise<string> {
  const db = getDb();
  const now = new Date();
  const result = await db
    .collection(collection)
    .add({
      ...doc,
      createdAt: now,
      updatedAt: now,
    });
  return result.id;
}

export async function findOne<T>(
  collection: string,
  query: Record<string, unknown>
): Promise<T | null> {
  const db = getDb();
  const result = await db.collection(collection).where(query).get();
  if (result.data.length === 0) {
    return null;
  }
  return result.data[0] as T;
}

export async function findMany<T>(
  collection: string,
  query: Record<string, unknown>,
  options?: { limit?: number; orderBy?: { field: string; direction: "asc" | "desc" } }
): Promise<T[]> {
  const db = getDb();
  let cmd = db.collection(collection).where(query);
  if (options?.orderBy) {
    cmd = cmd.orderBy(options.orderBy.field, options.orderBy.direction);
  }
  if (options?.limit) {
    cmd = cmd.limit(options.limit);
  }
  const result = await cmd.get();
  return result.data as T[];
}

export async function updateOne(
  collection: string,
  id: string,
  update: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  await db
    .collection(collection)
    .doc(id)
    .update({
      ...update,
      updatedAt: new Date(),
    });
}

export async function deleteOne(
  collection: string,
  id: string
): Promise<void> {
  const db = getDb();
  await db.collection(collection).doc(id).remove();
}
```

- [ ] **步骤 3：创建 cn 工具函数**

创建 `lib/utils/cn.ts`：

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **步骤 4：创建统一 API 响应工具**

创建 `lib/utils/response.ts`：

```typescript
import { NextResponse } from "next/server";
import type { ApiSuccessResponse, ApiErrorResponse, ErrorCode } from "@/types/api";

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function unauthorizedResponse(message = "未登录或登录已过期"): NextResponse<ApiErrorResponse> {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function validationErrorResponse(message: string, details?: Record<string, unknown>): NextResponse<ApiErrorResponse> {
  return errorResponse("VALIDATION_ERROR", message, 422, details);
}

export function internalErrorResponse(message = "服务器内部错误"): NextResponse<ApiErrorResponse> {
  return errorResponse("INTERNAL_ERROR", message, 500);
}
```

- [ ] **步骤 5：创建输入校验工具**

创建 `lib/utils/validation.ts`：

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(64, "密码最多 64 位"),
  displayName: z.string().min(1, "昵称不能为空").max(30, "昵称最多 30 字符"),
});

export const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "密码不能为空"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **步骤 6：Commit**

```bash
git add lib/ types/
git commit -m "feat: 集成 CloudBase 客户端与工具函数"
```

---

## 任务 5：认证 API 实现

**文件：**
- 创建：`lib/cloudbase/auth.ts`
- 创建：`app/api/auth/register/route.ts`
- 创建：`app/api/auth/login/route.ts`
- 创建：`app/api/auth/logout/route.ts`
- 创建：`app/api/auth/me/route.ts`

- [ ] **步骤 1：创建认证工具（会话管理）**

创建 `lib/cloudbase/auth.ts`：

```typescript
import { cookies } from "next/headers";
import { getAuth, getDb } from "./client";
import { findOne, Collections } from "./db";
import type { User, UserSession } from "@/types/user";

const SESSION_COOKIE = "mycareer_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 天

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const auth = getAuth();
  const { uid } = await auth.signUpWithEmailAndPassword(email, password);

  const now = new Date();
  const userDoc = {
    _id: uid,
    email,
    passwordHash: "",
    displayName,
    preferredLang: "zh" as const,
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  await db.collection(Collections.USERS).add(userDoc);

  return userDoc as User;
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const auth = getAuth();
  const { uid, refreshToken } = await auth.signInWithEmailAndPassword(email, password);

  const user = await findOne<User>(Collections.USERS, { _id: uid });
  if (!user) {
    throw new Error("用户记录不存在");
  }

  return { user, token: refreshToken };
}

export async function setSession(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export function clearSession(): void {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function getSessionToken(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const token = getSessionToken();
  if (!token) {
    return null;
  }

  try {
    const auth = getAuth();
    const userInfo = await auth.getUserInfo();
    const user = await findOne<User>(Collections.USERS, { _id: userInfo.uid });
    if (!user) {
      return null;
    }
    return {
      userId: user._id,
      email: user.email,
      displayName: user.displayName,
      preferredLang: user.preferredLang,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<UserSession> {
  const session = await getCurrentUser();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
```

- [ ] **步骤 2：创建注册 API**

创建 `app/api/auth/register/route.ts`：

```typescript
import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/utils/validation";
import { registerUser, loginUser, setSession } from "@/lib/cloudbase/auth";
import { successResponse, validationErrorResponse, internalErrorResponse, errorResponse } from "@/lib/utils/response";
import { findOne, Collections } from "@/lib/cloudbase/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { email, password, displayName } = parsed.data;

    const existing = await findOne(Collections.USERS, { email });
    if (existing) {
      return errorResponse("CONFLICT", "该邮箱已注册", 409);
    }

    await registerUser(email, password, displayName);

    const { token } = await loginUser(email, password);
    await setSession(token);

    return successResponse({
      success: true,
    }, 201);
  } catch (error) {
    console.error("注册失败:", error);
    return internalErrorResponse("注册失败，请稍后重试");
  }
}
```

- [ ] **步骤 3：创建登录 API**

创建 `app/api/auth/login/route.ts`：

```typescript
import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/utils/validation";
import { loginUser, setSession } from "@/lib/cloudbase/auth";
import { successResponse, validationErrorResponse, internalErrorResponse, unauthorizedResponse } from "@/lib/utils/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const { user, token } = await loginUser(email, password);
    await setSession(token);

    return successResponse({
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        preferredLang: user.preferredLang,
      },
    });
  } catch (error) {
    console.error("登录失败:", error);
    return unauthorizedResponse("邮箱或密码错误");
  }
}
```

- [ ] **步骤 4：创建登出 API**

创建 `app/api/auth/logout/route.ts`：

```typescript
import { clearSession } from "@/lib/cloudbase/auth";
import { successResponse } from "@/lib/utils/response";

export async function POST() {
  clearSession();
  return successResponse({ success: true });
}
```

- [ ] **步骤 5：创建当前用户 API**

创建 `app/api/auth/me/route.ts`：

```typescript
import { getCurrentUser } from "@/lib/cloudbase/auth";
import { successResponse, unauthorizedResponse } from "@/lib/utils/response";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return unauthorizedResponse();
  }
  return successResponse({ user: session });
}
```

- [ ] **步骤 6：手动验证 API**

运行：`npm run dev`

用 curl 测试注册：
```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"12345678","displayName":"测试用户"}'
```
预期：返回 201

用 curl 测试登录：
```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"12345678"}'
```
预期：返回 200 + 用户信息

- [ ] **步骤 7：Commit**

```bash
git add lib/cloudbase/auth.ts app/api/auth/
git commit -m "feat: 实现认证 API（注册/登录/登出/当前用户）"
```

---

## 任务 6：认证中间件

**文件：**
- 创建：`middleware.ts`

- [ ] **步骤 1：创建认证中间件**

创建 `middleware.ts`：

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "mycareer_session";

const PUBLIC_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **步骤 2：验证中间件**

运行：`npm run dev`
- 未登录访问 http://localhost:3000/dashboard → 重定向到 /login
- 未登录访问 http://localhost:3000/login → 正常显示

- [ ] **步骤 3：Commit**

```bash
git add middleware.ts
git commit -m "feat: 添加认证中间件"
```

---

## 任务 7：i18n 配置

**文件：**
- 创建：`lib/i18n/config.ts`
- 创建：`lib/i18n/messages/zh.json`
- 创建：`lib/i18n/messages/en.json`
- 创建：`i18n.ts`
- 修改：`next.config.js`

- [ ] **步骤 1：创建 i18n 配置**

创建 `lib/i18n/config.ts`：

```typescript
export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};
```

- [ ] **步骤 2：创建中文翻译文件**

创建 `lib/i18n/messages/zh.json`：

```json
{
  "common": {
    "appName": "求职助手",
    "loading": "加载中...",
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "confirm": "确认",
    "back": "返回"
  },
  "auth": {
    "login": "登录",
    "register": "注册",
    "logout": "登出",
    "email": "邮箱",
    "password": "密码",
    "displayName": "昵称",
    "loginTitle": "登录求职助手",
    "registerTitle": "创建账号",
    "noAccount": "还没有账号？",
    "hasAccount": "已有账号？",
    "loginNow": "立即登录",
    "registerNow": "立即注册",
    "emailPlaceholder": "请输入邮箱",
    "passwordPlaceholder": "请输入密码",
    "displayNamePlaceholder": "请输入昵称",
    "loginSuccess": "登录成功",
    "registerSuccess": "注册成功",
    "loginFailed": "登录失败",
    "registerFailed": "注册失败"
  },
  "nav": {
    "dashboard": "仪表盘",
    "resume": "简历",
    "jd": "岗位匹配",
    "greeting": "打招呼",
    "interview": "模拟面试",
    "applications": "投递记录"
  },
  "dashboard": {
    "title": "仪表盘",
    "welcome": "欢迎回来，{name}",
    "resumeCount": "简历数量",
    "jdCount": "JD 数量",
    "interviewCount": "面试练习",
    "applicationCount": "投递记录",
    "quickActions": "快捷操作",
    "uploadResume": "上传简历",
    "pasteJD": "粘贴 JD",
    "startInterview": "开始面试"
  }
}
```

- [ ] **步骤 3：创建英文翻译文件**

创建 `lib/i18n/messages/en.json`：

```json
{
  "common": {
    "appName": "MyCareer",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "back": "Back"
  },
  "auth": {
    "login": "Log in",
    "register": "Sign up",
    "logout": "Log out",
    "email": "Email",
    "password": "Password",
    "displayName": "Display Name",
    "loginTitle": "Log in to MyCareer",
    "registerTitle": "Create Account",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "loginNow": "Log in",
    "registerNow": "Sign up",
    "emailPlaceholder": "Enter your email",
    "passwordPlaceholder": "Enter your password",
    "displayNamePlaceholder": "Enter your display name",
    "loginSuccess": "Logged in successfully",
    "registerSuccess": "Account created successfully",
    "loginFailed": "Login failed",
    "registerFailed": "Registration failed"
  },
  "nav": {
    "dashboard": "Dashboard",
    "resume": "Resume",
    "jd": "Job Match",
    "greeting": "Greeting",
    "interview": "Mock Interview",
    "applications": "Applications"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {name}",
    "resumeCount": "Resumes",
    "jdCount": "Job Descriptions",
    "interviewCount": "Interview Practices",
    "applicationCount": "Applications",
    "quickActions": "Quick Actions",
    "uploadResume": "Upload Resume",
    "pasteJD": "Paste JD",
    "startInterview": "Start Interview"
  }
}
```

- [ ] **步骤 4：创建 next-intl 配置文件**

创建 `i18n.ts`：

```typescript
import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./lib/i18n/config";

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`./lib/i18n/messages/${locale || defaultLocale}.json`)).default,
  };
});
```

- [ ] **步骤 5：更新 next.config.js**

修改 `next.config.js`：

```javascript
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withNextIntl(nextConfig);
```

- [ ] **步骤 6：Commit**

```bash
git add lib/i18n/ i18n.ts next.config.js
git commit -m "feat: 配置中英双语 i18n"
```

---

## 任务 8：基础布局组件

**文件：**
- 创建：`components/layout/sidebar.tsx`
- 创建：`components/layout/mobile-nav.tsx`
- 创建：`components/layout/header.tsx`
- 创建：`app/(main)/layout.tsx`

- [ ] **步骤 1：创建 PC 侧边栏**

创建 `components/layout/sidebar.tsx`：

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Briefcase, MessageSquare, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/resume", icon: FileText, key: "resume" },
  { href: "/jd", icon: Briefcase, key: "jd" },
  { href: "/greeting", icon: MessageSquare, key: "greeting" },
  { href: "/interview", icon: Mic, key: "interview" },
  { href: "/applications", icon: Send, key: "applications" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-secondary/30">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <span className="text-lg font-semibold text-foreground">
          {tCommon("appName")}
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="mr-3 h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **步骤 2：创建手机底部导航**

创建 `components/layout/mobile-nav.tsx`：

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Briefcase, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

const mobileNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/resume", icon: FileText, key: "resume" },
  { href: "/jd", icon: Briefcase, key: "jd" },
  { href: "/interview", icon: Mic, key: "interview" },
  { href: "/applications", icon: Send, key: "applications" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border">
      <div className="grid grid-cols-5 h-16">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **步骤 3：创建顶部栏**

创建 `components/layout/header.tsx`：

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Globe, LogOut, User as UserIcon } from "lucide-react";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

interface HeaderProps {
  userName: string;
}

export function Header({ userName }: HeaderProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const tAuth = useTranslations("auth");
  const locale = useLocale() as Locale;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const switchLocale = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6">
      <div className="md:hidden">
        <span className="font-semibold">{t("appName")}</span>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {locales.map((l) => (
              <DropdownMenuItem
                key={l}
                onClick={() => switchLocale(l)}
                className={l === locale ? "bg-accent" : ""}
              >
                {localeNames[l]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <UserIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-sm">
              {userName}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {tAuth("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **步骤 4：创建主布局**

创建 `app/(main)/layout.tsx`：

```typescript
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/cloudbase/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-60 flex flex-col min-h-screen">
        <Header userName={session.displayName} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
```

- [ ] **步骤 5：Commit**

```bash
git add components/layout/ app/\(main\)/layout.tsx
git commit -m "feat: 实现响应式布局（PC 侧边栏 + 手机底部导航）"
```

---

## 任务 9：认证页面

**文件：**
- 创建：`app/(auth)/layout.tsx`
- 创建：`app/(auth)/login/page.tsx`
- 创建：`app/(auth)/register/page.tsx`

- [ ] **步骤 1：创建认证布局**

创建 `app/(auth)/layout.tsx`：

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
```

- [ ] **步骤 2：创建登录页面**

创建 `app/(auth)/login/page.tsx`：

```typescript
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/utils/validation";
import type { LoginInput } from "@/lib/utils/validation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || t("loginFailed"));
        return;
      }
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
      router.refresh();
    } catch {
      setError(t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">{t("loginTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t("loginNow")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <a href="/register" className="text-primary hover:underline">
              {t("registerNow")}
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **步骤 3：创建注册页面**

创建 `app/(auth)/register/page.tsx`：

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/utils/validation";
import type { RegisterInput } from "@/lib/utils/validation";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || t("registerFailed"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">{t("registerTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              type="text"
              placeholder={t("displayNamePlaceholder")}
              {...register("displayName")}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t("registerNow")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <a href="/login" className="text-primary hover:underline">
              {t("loginNow")}
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **步骤 4：验证认证页面**

运行：`npm run dev`
- 访问 http://localhost:3000/login → 看到登录表单
- 访问 http://localhost:3000/register → 看到注册表单
- 输入错误显示错误提示

- [ ] **步骤 5：Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: 实现登录与注册页面"
```

---

## 任务 10：仪表盘页面

**文件：**
- 创建：`app/(main)/dashboard/page.tsx`

- [ ] **步骤 1：创建仪表盘页面**

创建 `app/(main)/dashboard/page.tsx`：

```typescript
import { getCurrentUser } from "@/lib/cloudbase/auth";
import { findMany, Collections } from "@/lib/cloudbase/db";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Briefcase, Mic, Send, Upload, ClipboardPaste, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getCurrentUser();
  const t = useTranslations("dashboard");

  const [resumes, jds, interviews, applications] = await Promise.all([
    findMany(Collections.RESUMES, { userId: session!.userId }),
    findMany(Collections.JDS, { userId: session!.userId }),
    findMany(Collections.INTERVIEWS, { userId: session!.userId }),
    findMany(Collections.APPLICATIONS, { userId: session!.userId }),
  ]);

  const stats = [
    { label: t("resumeCount"), value: resumes.length, icon: FileText },
    { label: t("jdCount"), value: jds.length, icon: Briefcase },
    { label: t("interviewCount"), value: interviews.length, icon: Mic },
    { label: t("applicationCount"), value: applications.length, icon: Send },
  ];

  const quickActions = [
    { label: t("uploadResume"), href: "/resume/upload", icon: Upload },
    { label: t("pasteJD"), href: "/jd/input", icon: ClipboardPaste },
    { label: t("startInterview"), href: "/interview", icon: Play },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("welcome", { name: session!.displayName })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-4 md:p-6 flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：验证仪表盘**

运行：`npm run dev`
- 登录后访问 http://localhost:3000/dashboard
- 预期：看到欢迎信息、4 个统计卡片（均为 0）、3 个快捷操作

- [ ] **步骤 3：Commit**

```bash
git add app/\(main\)/dashboard/
git commit -m "feat: 实现仪表盘页面"
```

---

## 任务 11：DeepSeek AI 客户端

**文件：**
- 创建：`lib/ai/deepseek.ts`

- [ ] **步骤 1：创建 DeepSeek 客户端**

创建 `lib/ai/deepseek.ts`：

```typescript
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json_object";
  }
): Promise<DeepSeekResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 环境变量未设置");
  }

  const body: Record<string, unknown> = {
    model: "deepseek-chat",
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
  };

  if (options?.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  return {
    content,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
  };
}

export async function callDeepSeekForJSON<T>(
  messages: DeepSeekMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const response = await callDeepSeek(messages, {
    ...options,
    responseFormat: "json_object",
  });

  try {
    return JSON.parse(response.content) as T;
  } catch (error) {
    throw new Error(`DeepSeek 返回的 JSON 解析失败: ${error}`);
  }
}

export async function callDeepSeekWithRetry(
  messages: DeepSeekMessage[],
  options?: { temperature?: number; maxTokens?: number; responseFormat?: "text" | "json_object" },
  maxRetries = 3
): Promise<DeepSeekResponse> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callDeepSeek(messages, options);
    } catch (error) {
      lastError = error as Error;
      console.warn(`DeepSeek 调用失败 (第 ${i + 1} 次):`, error);
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new Error("DeepSeek 调用失败");
}
```

- [ ] **步骤 2：Commit**

```bash
git add lib/ai/deepseek.ts
git commit -m "feat: 实现 DeepSeek AI 客户端"
```

---

## 任务 12：根布局与首页重定向

**文件：**
- 修改：`app/layout.tsx`
- 修改：`app/page.tsx`

- [ ] **步骤 1：更新根布局集成 next-intl**

修改 `app/layout.tsx`：

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "求职助手 | MyCareer",
  description: "面向求职者的智能助手 - 简历生成、JD匹配、模拟面试",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **步骤 2：创建首页重定向**

修改 `app/page.tsx`：

```typescript
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/cloudbase/auth";

export default async function Home() {
  const session = await getCurrentUser();
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
```

- [ ] **步骤 3：验证完整流程**

运行：`npm run dev`
- 访问 http://localhost:3000 → 重定向到 /login
- 注册新用户 → 跳转到 /dashboard
- 看到仪表盘，统计均为 0
- 登出 → 回到 /login

- [ ] **步骤 4：Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: 配置根布局与首页重定向"
```

---

## 任务 13：Jest 测试配置与基础测试

**文件：**
- 创建：`jest.config.ts`
- 创建：`jest.setup.ts`
- 创建：`lib/utils/__tests__/validation.test.ts`

- [ ] **步骤 1：创建 Jest 配置**

创建 `jest.config.ts`：

```typescript
import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
```

创建 `jest.setup.ts`：

```typescript
import "@testing-library/jest-dom";
```

- [ ] **步骤 2：编写校验工具测试**

创建 `lib/utils/__tests__/validation.test.ts`：

```typescript
import { registerSchema, loginSchema } from "../validation";

describe("registerSchema", () => {
  it("应接受有效的注册输入", () => {
    const valid = {
      email: "test@example.com",
      password: "12345678",
      displayName: "测试用户",
    };
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("应拒绝无效邮箱", () => {
    const invalid = {
      email: "not-an-email",
      password: "12345678",
      displayName: "测试",
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("应拒绝短密码（少于8位）", () => {
    const invalid = {
      email: "test@example.com",
      password: "1234567",
      displayName: "测试",
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("应拒绝空昵称", () => {
    const invalid = {
      email: "test@example.com",
      password: "12345678",
      displayName: "",
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("应接受有效的登录输入", () => {
    const valid = {
      email: "test@example.com",
      password: "anypassword",
    };
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("应拒绝无效邮箱", () => {
    const invalid = {
      email: "not-an-email",
      password: "123456",
    };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("应拒绝空密码", () => {
    const invalid = {
      email: "test@example.com",
      password: "",
    };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **步骤 3：添加测试脚本到 package.json**

修改 `package.json` 的 scripts 部分，添加：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 5：Commit**

```bash
git add jest.config.ts jest.setup.ts lib/utils/__tests__/ package.json
git commit -m "test: 添加 Jest 配置与校验工具测试"
```

---

## 任务 14：占位页面与最终验证

**文件：**
- 创建：`app/(main)/resume/page.tsx`（占位）
- 创建：`app/(main)/jd/page.tsx`（占位）
- 创建：`app/(main)/greeting/page.tsx`（占位）
- 创建：`app/(main)/interview/page.tsx`（占位）
- 创建：`app/(main)/applications/page.tsx`（占位）

- [ ] **步骤 1：创建占位页面**

创建 `app/(main)/resume/page.tsx`：

```typescript
import { useTranslations } from "next-intl";

export default function ResumePage() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">{t("resume")} - 即将上线</p>
    </div>
  );
}
```

创建 `app/(main)/jd/page.tsx`：

```typescript
import { useTranslations } from "next-intl";

export default function JDPage() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">{t("jd")} - 即将上线</p>
    </div>
  );
}
```

创建 `app/(main)/greeting/page.tsx`：

```typescript
import { useTranslations } from "next-intl";

export default function GreetingPage() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">{t("greeting")} - 即将上线</p>
    </div>
  );
}
```

创建 `app/(main)/interview/page.tsx`：

```typescript
import { useTranslations } from "next-intl";

export default function InterviewPage() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">{t("interview")} - 即将上线</p>
    </div>
  );
}
```

创建 `app/(main)/applications/page.tsx`：

```typescript
import { useTranslations } from "next-intl";

export default function ApplicationsPage() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">{t("applications")} - 即将上线</p>
    </div>
  );
}
```

- [ ] **步骤 2：完整流程验证**

运行：`npm run dev`

验证清单：
- [ ] 访问 http://localhost:3000 → 重定向到 /login
- [ ] 登录页显示中文界面
- [ ] 注册新用户成功，跳转到 /dashboard
- [ ] 仪表盘显示欢迎信息 + 4 个统计卡片（0）+ 3 个快捷操作
- [ ] PC 端左侧导航栏 6 个菜单项
- [ ] 手机端底部导航 5 个菜单项
- [ ] 点击各导航项能跳转到占位页面
- [ ] 顶部栏语言切换能切换中英文
- [ ] 顶部栏用户菜单登出能回到登录页
- [ ] 未登录访问受保护页面会重定向到 /login

- [ ] **步骤 3：运行测试**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 4：Commit**

```bash
git add app/\(main\)/
git commit -m "feat: 添加占位页面与完成阶段 1 基础设施"
```

---

## 阶段 1 完成标准

- [ ] Next.js 项目能正常启动
- [ ] 用户能注册、登录、登出
- [ ] 认证中间件正确保护路由
- [ ] 响应式布局在 PC 和手机端正常显示
- [ ] 中英双语切换正常工作
- [ ] 仪表盘显示统计数据
- [ ] DeepSeek 客户端可调用
- [ ] CloudBase 数据库连接正常
- [ ] 单元测试通过
- [ ] 所有代码已提交到 Git

## 后续阶段预告

- **阶段 2**：简历生成核心（4 种输入方式 + 标准版生成 + 防幻觉机制）
- **阶段 3**：JD 匹配 + 定制简历
- **阶段 4**：打招呼话术 + 模拟面试
- **阶段 5**：投递记录 + PDF 导出 + 部署优化
