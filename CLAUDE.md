# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

智能简历助手（mycareer）— 基于 DeepSeek AI 的简历分析与面试模拟平台。

**技术栈**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Radix UI · CloudBase · next-intl

---

## 开发流程规则

### 核心规则（必须遵守）

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 `brainstorming` skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（使用 `test-driven-development` skill）
4. **验证先于完成** — 声称完成前必须运行验证命令（使用 `verification-before-completion` skill）

### Skill 使用时机

| 场景 | 必须使用的 Skill |
|------|----------------|
| 任何创造性工作之前（创建功能、构建组件、添加功能） | `brainstorming` |
| 实现任何功能或修复 bug 之前 | `test-driven-development` |
| 宣称工作完成之前 | `verification-before-completion` |
| 收到代码审查反馈后、实施建议之前 | `receiving-code-review` |
| 提交代码或创建 PR 之前 | `requesting-code-review` |
| 遇到 bug、测试失败或异常行为时 | `systematic-debugging` |

> Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。
> 使用 `Skill` 工具加载对应 skill 并严格遵循其流程，绝不要用 Read 工具读取 SKILL.md 文件。

---

## 推荐开发顺序（V1.0）

按优先级从高到低：

1. **优势识别**（Phase 0）— 独立功能，3周，可作为用户首次访问的引导入口
2. **P0 缺陷修复** — 修复 /resume/new 断链、/jd/input 链接错误、JD status schema 不一致、简历文件上传 Storage
3. **投递记录**（P1）— 商业闭环节点
4. **PDF 导出**（P1）— 用户核心诉求
5. **简历编辑页面**（P1）— API 已存在，缺 UI

---

## 常用命令

```bash
npm run dev      # 开发服务器 localhost:3000
npm run build    # 生产构建（standalone 模式，用于 CloudBase 部署）
npm run start    # 启动生产服务器
npm run lint     # ESLint 检查
npm test         # Jest 测试
npm run test:watch  # 监听模式
```

---

## 架构

### 目录结构

```
app/                    # Next.js App Router
  (auth)/               # 公开路由组（login, register）
  (main)/               # 受保护路由组（dashboard, resume, jd, interview）
  api/                  # API 路由（auth, resumes, jds, interviews, greetings）
components/
  ui/                   # Radix UI 基础组件（CVA 变体）
  resume/               # 简历相关业务组件
  layout/               # 布局组件（Sidebar, Header, MobileNav）
lib/
  ai/deepseek.ts        # DeepSeek API 封装
  ai/prompts/           # AI Prompt 模块（解析/生成/评分等）
  cloudbase/            # CloudBase 数据库/认证封装
  utils/                # 通用工具（cn, file-extract, markdown, response）
types/                  # TypeScript 类型定义（user, resume, jd, interview）
```

### 认证

`middleware.ts` 基于 Edge Runtime 的 JWT 校验，session 存储在 `mycareer_session` cookie 中。`lib/cloudbase/auth.ts` 处理 CloudBase 登录/注册。

### AI 集成

`lib/ai/deepseek.ts` 封装 DeepSeek API，简历解析和面试模拟均通过此处调用。AI Prompt 模块位于 `lib/ai/prompts/`，包含反幻觉、来源追溯、确认项等防护机制。

### 部署

`next.config.js` 配置 `output: "standalone"` + `images.unoptimized: true`（CloudBase 云函数环境要求）。`deploy/` 目录包含阿里云部署脚本（PM2 + Nginx + SSL）。

### i18n

`i18n.ts` 使用 next-intl，单 locale 模式（默认 locale），消息文件位于 `lib/i18n/messages/`。

### 数据库

CloudBase（腾讯云开发）提供数据库和存储支持，`lib/cloudbase/` 封装了 resumes、jds、interviews 等集合的 CRUD 操作。

---

## 开发注意事项

- `@cloudbase/node-sdk` 类型不严格，`next.config.js` 中 `ignoreBuildErrors: true`
- 云函数环境无 Sharp，图片优化已禁用
- 生产环境变量参考 `deploy/env.production.example`
- API 路由需校验 userId 防止越权访问
- JWT secret 需在生产环境更换