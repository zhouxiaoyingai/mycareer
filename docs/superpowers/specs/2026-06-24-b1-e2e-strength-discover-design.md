# B1:优势识别问卷 E2E 测试 — 设计

> 日期:2026-06-24
> 状态:**已批准,实施待 Supabase 迁移完成**
> 相关任务:[2026-06-23-strength-discovery.md](./2026-06-23-strength-discovery.md) 计划中的 E2E 缺失

## 1. 目标

为优势识别问卷([`app/(main)/discover/page.tsx`](../../../app/(main)/discover/page.tsx))的"7 步问卷 → 报告生成"主路径添加端到端(E2E)测试,在真实浏览器中验证用户关键流程上线,补齐单元测试无法覆盖的"前后端集成 + UI 交互"层。

## 2. 范围

### 2.1 覆盖(In-Scope)

- 7 步问卷按顺序填写(single / multi / scale / ranking 四种题型各覆盖)
- 进度条更新
- 提交按钮触发
- 报告渲染(4 块:可迁移技能 / 职业路径 / 快速起步 / 现实检验)
- localStorage 草稿持久化(可选断言)

### 2.2 不覆盖(Out-of-Scope,留待后续)

- ❌ 错误路径(AI 超时 / API 失败 / 网络中断) → B2
- ❌ i18n 中英文切换
- ❌ History 列表 / Delete 流程
- ❌ Resume prefill banner
- ❌ 多账号权限测试
- ❌ 移动端响应式 / 跨浏览器(Firefox/WebKit)兼容
- ❌ 性能指标(LCP/CLS)
- ❌ CI 自动运行(本设计仅本地手动)

## 3. 依赖与前置

### 3.1 阻塞条件:Supabase 迁移必须完成

master 当前状态(2026-06-24 上午)有未提交 WIP:[2026-06-23-supabase-vercel-migration-design.md](./2026-06-23-supabase-vercel-migration-design.md),删除了 `lib/cloudbase/*` 但 `app/api/strength/reports/route.ts` 仍 import `@/lib/cloudbase/auth` 和 `@/lib/cloudbase/strength`,**当前 master 不可 build**。

E2E 测试需要 dev/prod server 启动,**B1 实施必须在 Supabase 迁移合并后启动**。

### 3.2 技术栈

| 类别 | 选择 |
|------|------|
| 框架 | Playwright (`@playwright/test`) |
| 语言 | TypeScript(项目统一) |
| 浏览器 | Chromium(其他浏览器本设计不要求) |
| Mock 方式 | `page.route()` 拦截网络层 |
| WebServer | Playwright `webServer` 选项自动启动 `next dev` |

## 4. 架构

```
mycareer/
├── playwright.config.ts          # 新增:Playwright 配置
├── e2e/                          # 新增:与 jest 单元测试隔离
│   ├── fixtures/
│   │   ├── completed-report.json # 固定 completed 报告(模拟 AI 输出)
│   │   └── session.json          # 预生成 Supabase session cookie
│   ├── helpers/
│   │   └── auth.ts               # loginAsTestUser(page)
│   └── discover.spec.ts          # 主路径测试
└── package.json                  # 新增 @playwright/test, npm run e2e
```

**与 jest 隔离**:`jest.config.ts` 已通过 `testPathIgnorePatterns` 排除 `.next/` 和 `.worktrees/`,但**未排除 `e2e/`**。需在 jest 配置中追加:
```ts
testPathIgnorePatterns: [
  "<rootDir>/.next/",
  "<rootDir>/.worktrees/",
  "<rootDir>/e2e/",  // 新增:让 jest 不碰 Playwright 测试
]
```

**Playwright 配置不碰 e2e 之外的代码**:`testDir: "./e2e"`,`testMatch: "**/*.spec.ts"`,自动隔离。

## 5. 测试设计

### 5.1 核心测试:e2e/discover.spec.ts

**用例一:主路径 happy path**(唯一 spec,1 个 test,完整覆盖 7 步 + 报告)

| 步骤 | 动作 | 断言 |
|------|------|------|
| 1 | 注入 session cookie,导航 `/discover` | 显示 Q1 + 进度条 1/7 |
| 2 | Q1 single: 点击"我有工作,但想看看其他机会" | 选中样式生效 |
| 3 | Q2 multi: 点击 2 个 flow experience | 进度条 → 2/7 |
| 4 | Q3 single: 点击"解决了别人解决不了的问题" | 选中样式 |
| 5 | Q4 scale: 给 6 个 dimension 各点 4 分 | scale 数字更新 |
| 6 | Q5 ranking: 用 ↑/↓ 按钮调整顺序 | 顺序改变 |
| 7 | Q6 single: 点击"先边工作边了解" | 选中 |
| 8 | Q7 multi(可选): 跳过 | 进度条 → 7/7 |
| 9 | `page.route('**/api/strength/reports/*', mockCompletedReport)` | mock 命中 |
| 10 | 点"生成报告" | POST 真实触发 |
| 11 | 等待 ReportView 出现 | 4 块内容渲染 |
| 12 | 断言"可迁移技能" / "推荐职业路径" / "快速起步" / "现实检验" 4 个标题都可见 | 关键文本匹配 |

**用例二(可选)**:localStorage 草稿恢复 — 填到 Q3 后刷新,验证 Q1-Q3 答案恢复。本设计不强制,可作为 follow-up。

### 5.2 Mock 策略

**仅 Mock GET 轮询响应**,POST 走真实后端。

```ts
// e2e/helpers/strength-mock.ts
import { completedReportFixture } from "../fixtures/completed-report.json";

export async function mockCompletedReport(route: Route) {
  const url = new URL(route.request().url());
  if (url.pathname.match(/\/api\/strength\/reports\/[^/]+$/) && route.request().method() === "GET") {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(completedReportFixture),
    });
  } else {
    await route.continue();
  }
}
```

**为什么 POST 不 mock**:
- 验证后端 API 路由集成
- 验证 auth 中间件集成
- 验证 CloudBase/Supabase 写入路径

**为什么不 mock AI provider**:
- 后端已经在 `generateStrengthReport(...).catch(...)` 中触发真实 AI,但不 await
- GET 轮询是用户实际等待的路径,被 mock 后 AI 完成态立即返回
- AI provider 调用本身不在 E2E 验证范围(由单元测试 `strength-analyze.test.ts` 覆盖)

### 5.3 认证策略

**Cookie/Session 注入**,不依赖登录 UI。

**Supabase 会话 cookie 格式**(待迁移完成后确认):
- Cookie 名:(`sb-<project-ref>-auth-token` 或类似)
- Cookie 值:JSON 字符串,包含 `access_token` / `refresh_token` / `expires_at`
- 域:`localhost`

```ts
// e2e/fixtures/session.json
{
  "name": "sb-auth-token",
  "domain": "localhost",
  "path": "/",
  "httpOnly": false,
  "secure": false,
  "expires": -1,
  "value": "<base64-encoded-session-json>"
}
```

**生成方式**(开发者手动一次):
1. 启动 dev server
2. 浏览器登录测试账号
3. DevTools → Application → Cookies → 复制 Supabase auth cookie
4. 粘到 `e2e/fixtures/session.json`
5. token 过期时重新生成

**注入方式**:
```ts
// e2e/helpers/auth.ts
import session from "../fixtures/session.json";

export async function loginAsTestUser(context: BrowserContext) {
  await context.addCookies([session]);
}
```

**测试账号要求**:
- 在 Supabase 中存在有效账号
- 数据库已清空 strength reports(或测试后清理)
- 不影响其他环境数据

### 5.4 报告 Fixture

`e2e/fixtures/completed-report.json` 结构必须严格匹配 `Report` interface([discover/page.tsx 第 51-69 行](../../../app/(main)/discover/page.tsx#L51-L69)):

```json
{
  "_id": "test-report-001",
  "status": "completed",
  "report": {
    "transferableSkills": [
      { "skill": "结构化写作", "transferTo": "产品文档", "evidence": "..." }
    ],
    "careerPaths": [
      {
        "careerName": "产品经理",
        "industry": "互联网",
        "skillMatch": "80%",
        "entryPath": "...",
        "salaryRange": "15-30K",
        "searchStrategy": "...",
        "transitionTime": "6-12个月"
      }
    ],
    "quickWins": [
      { "step": "阅读《启示录》", "resource": "https://...", "purpose": "..." }
    ],
    "realityCheck": {
      "bestFit": "产品经理",
      "timelines": [
        { "path": "路径A", "phase": "准备期", "duration": "1-3个月" }
      ]
    }
  }
}
```

最小 1 个 skill / 1 个 path / 1 个 quickWin / 1 个 timeline 即可让所有 4 块渲染。

## 6. 配置文件

### 6.1 playwright.config.ts

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,           // 单 spec,顺序跑
  workers: 1,
  retries: 0,                     // 本地手动跑,失败即查
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### 6.2 package.json 新增

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:headed": "playwright test --headed",
    "e2e:install": "playwright install chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0"
  }
}
```

## 7. 运行与维护

### 7.1 首次运行

```bash
npm install
npx playwright install chromium     # ~150MB 下载
npm run e2e
```

### 7.2 调试

```bash
npm run e2e:headed                  # 看浏览器
npx playwright test --debug         # step-by-step
npx playwright show-report          # 看 trace/screenshot
```

### 7.3 维护清单

- [ ] Supabase auth cookie 过期时(默认 1 小时):更新 `session.json`
- [ ] `Report` interface 变更时:同步 `completed-report.json` 结构
- [ ] 7 步问卷增删/换顺序时:同步 `discover.spec.ts` 步骤
- [ ] API 路径变更(如 `/api/strength/reports/*`):同步 mock 路径正则

## 8. 风险与限制

| 风险 | 缓解 |
|------|------|
| Supabase 迁移未完成 → B1 无法实施 | 本设计文档作为"待启动"任务,等迁移合并后再开新会话 |
| Auth cookie 过期导致测试失败 | 文档化手动重新生成流程;后续可加自动刷新逻辑 |
| 测试账号 strength reports 累积 | 文档要求测试前清空;后续可加 afterAll 清理 |
| `next dev` 启动慢(>30s) | webServer.timeout 设为 120s;若仍不够,改用 `next build && next start` |
| 7 步问卷 UI 改动 → 测试断 | 测试用语义 selector(`getByRole`, `getByText`)而非 CSS class;且单一 spec 易维护 |

## 9. 验收标准

- [ ] `npm run e2e` 在本地 1 分钟内完成(1 spec,1 test)
- [ ] 失败时自动保存 trace + screenshot
- [ ] 故意破坏任意一个 UI 文本(如改"提交"为"Submit")时,测试明确失败
- [ ] 故意让 mock 返回 status=processing 时,前端"生成中"状态正确显示
- [ ] jest 单测仍 10/10 suites,131/131 tests pass(e2e/test 隔离无干扰)

## 10. 后续工作(非本设计范围)

- 实施本设计 → writing-plans 技能产 plan → 实施
- B2:错误路径 E2E(超时 / 401 / 500)
- B3:i18n 中英文 E2E
- C1:Cleanup 异常 worktree
- CI:Gitee Go / GitHub Actions 集成
