# 会话总结：注册/上传修复与阶段3规划

> **会话日期：** 2026-06-17
> **会话主题：** 修复注册、Dashboard、简历上传等关键 Bug，并规划阶段3（JD 匹配与定制简历）
> **项目：** mycareer - AI 辅助求职工具

---

## 一、会话交互记录

### 交互 1：注册失败排查

**用户输入：**
```
提示注册失败
执行到哪一步了，有什么卡点吗
```

**AI 返回结果：**
- **卡点定位**：注册失败错误 `TypeError: Cannot read properties of null (reading 'scope')`
- **根本原因**：项目错误地在前端使用了 `@cloudbase/js-sdk`（浏览器 SDK）来做服务端鉴权，而 `signUpWithEmailAndPassword` 需要浏览器环境和 CloudBase 控制台开启邮箱密码登录
- **解决方案**：改用 `@cloudbase/node-sdk`（服务端 SDK）+ 自定义鉴权
  1. 安装 `@cloudbase/node-sdk`、`bcryptjs`、`jsonwebtoken`
  2. 重写 [lib/cloudbase/client.ts](file:///e:/mycareer/lib/cloudbase/client.ts) - 改用 node-sdk，使用 SecretId/SecretKey 管理员权限
  3. 重写 [lib/cloudbase/auth.ts](file:///e:/mycareer/lib/cloudbase/auth.ts) - 用 bcrypt 哈希密码存数据库，JWT 生成 session token
  4. 更新 [app/api/auth/register/route.ts](file:///e:/mycareer/app/api/auth/register/route.ts) - 适配新 auth 逻辑
  5. 添加 `JWT_SECRET` 环境变量
- **验证结果**：
  - ✅ 注册 API 测试通过（返回 201）
  - ✅ 登录 API 测试通过（返回 200 + 用户信息）
  - ✅ 用户数据成功写入 CloudBase `users` 集合

---

### 交互 2：Dashboard 页面运行时错误

**用户输入：**
```
提示邮箱已经注册，报错：Unhandled Runtime Error
Error: `useTranslations` is not callable within an async component.
Source: app\(main)\dashboard\page.tsx (10:29) @ DashboardPage
```

**AI 返回结果：**
- **问题定位**：`useTranslations` 不能在 async server component 中使用
- **修复方案**：[app/(main)/dashboard/page.tsx](file:///e:/mycareer/app/(main)/dashboard/page.tsx) 改用 `getTranslations`（来自 `next-intl/server`）
- **额外检查**：扫描所有 page.tsx 文件，确认其他 async server component 没有同样问题
- **结果**：dashboard 页面恢复正常，`GET /dashboard 200`

---

### 交互 3：Word 文本提取失败

**用户输入：**
```
上传简历失败：选择文件
张晨_北京科技大学_原始信息.docx
45.8 KB
Word 文本提取失败: Could not find file in options
```

**AI 返回结果：**
- **问题定位**：[lib/utils/file-extract.ts](file:///e:/mycareer/lib/utils/file-extract.ts) 中 mammoth 调用参数错误
- **根本原因**：使用了 `{ arrayBuffer }` 参数，但 mammoth 的 `extractRawText` 需要 `{ buffer }` 参数
- **修复方案**：改为 `mammoth.extractRawText({ buffer })`
- **结果**：Word 文档提取恢复正常

---

### 交互 4：HTTP 431 错误

**用户输入：**
```
上传简历后提示：该网页无法正常运作
如果问题仍然存在，请与网站所有者联系。
HTTP ERROR 431
```

**AI 返回结果：**
- **问题定位**：HTTP 431（请求头字段过大）
- **根本原因**：[app/(main)/resume/upload/page.tsx](file:///e:/mycareer/app/(main)/resume/upload/page.tsx) 把整个 AI 解析结果（structured + provenance）通过 URL query string 传递，导致 URL 过长
- **修复方案**：
  1. [app/api/resumes/upload/route.ts](file:///e:/mycareer/app/api/resumes/upload/route.ts) - 新增 `createResume` 调用，上传解析后立即创建 master 简历记录，返回 `resumeId`
  2. [app/(main)/resume/upload/page.tsx](file:///e:/mycareer/app/(main)/resume/upload/page.tsx) - 不再通过 URL 传大数据，直接跳转到 `/resume/{resumeId}` 详情页
- **结果**：上传简历后正常跳转到详情页

---

### 交互 5：下一步规划咨询

**用户输入：**
```
好的，目前正常了，你建议下一步先做哪些
```

**AI 返回结果：**
分析了当前进度和初始需求，给出优先级建议：

**已完成（阶段1-2）：**
- 项目基础设施（鉴权、数据库、UI组件）
- 简历上传/粘贴/解析（master 简历）
- 简历列表页/详情页
- 生成标准版简历（STAR原则 + 中英双版）
- 防幻觉机制（AI味检测、追溯信息）

**建议优先级：**
1. **优先级1：JD 匹配与定制简历（阶段3）** - 求职流程核心闭环
2. **优先级2：打招呼话术（阶段4）** - 投递敲门砖
3. **优先级3：模拟面试（阶段5）** - 投递后准备
4. **优先级4：投递管理（阶段6）** - 记录系统

推荐先做阶段3，体现防幻觉机制的价值。

---

### 交互 6：启动阶段3规划

**用户输入：**
```
好的，按照你的建议来进行
```

**AI 返回结果：**
- 调用 `writing-plans` skill 开始创建阶段3实现计划
- 检查现有代码：`lib/ai/prompts/jd-parse.ts`、`lib/ai/prompts/resume-tailor.ts`、`types/resume.ts`、`lib/cloudbase/resumes.ts`、`lib/cloudbase/db.ts`
- 开始编写实现计划文档，包含 16 个任务：
  1. JD 类型定义
  2. JD 数据访问层
  3. 更新 resume-tailor 提示词（新增待确认项）
  4. JD 创建/列表 API
  5. JD 详情/删除 API
  6. JD 解析 API
  7. 简历定制 API
  8. 待确认项处理 API
  9. JD 输入页
  10. JD 列表页
  11. JD 详情页
  12. 简历定制入口页
  13. 定制简历详情页
  14. 简历详情页增加入口
  15. 更新 i18n 文案
  16. 端到端测试
- **卡点**：Write 工具调用时参数错误（缺少 file_path），计划文档未成功保存

---

## 二、经验总结

### 1. CloudBase SDK 选择陷阱

**教训：** 在 Next.js App Router 中，服务端代码（API routes、server components）必须使用 `@cloudbase/node-sdk`，不能使用 `@cloudbase/js-sdk`（前端 SDK）。

**识别信号：**
- `Cannot read properties of null (reading 'scope')` - OAuth2Client 无凭据
- `signUpWithEmailAndPassword` 等前端 API 在服务端调用失败

**最佳实践：**
- 服务端鉴权用自定义方案（bcrypt + JWT），不依赖 CloudBase 前端 SDK 的邮箱密码登录
- CloudBase 仅作为数据库使用，鉴权逻辑独立实现

### 2. next-intl 在 Async Server Component 中的使用

**教训：** `useTranslations` 是客户端 Hook，不能在 async server component 中调用。

**正确用法：**
- Server Component（非 async）：可用 `useTranslations`
- Async Server Component：必须用 `getTranslations`（来自 `next-intl/server`）
- Client Component：用 `useTranslations`

**排查方法：** `grep "useTranslations" **/page.tsx` 找出所有使用点，逐一检查是否在 async 函数中

### 3. Mammoth Word 解析参数

**教训：** mammoth 的 `extractRawText` 接受 `{ buffer }` 参数（Node.js Buffer），不是 `{ arrayBuffer }`。

**错误写法：**
```typescript
mammoth.extractRawText({ arrayBuffer: buffer as unknown as ArrayBuffer })
```

**正确写法：**
```typescript
mammoth.extractRawText({ buffer })
```

### 4. URL 长度限制（HTTP 431）

**教训：** 永远不要通过 URL query string 传递大数据（如 AI 解析的 JSON 结果）。

**触发场景：**
- `router.push(`/resume/${id}?parsed=${encodeURIComponent(JSON.stringify(data))}`)`
- 当 data 包含 structured + provenance 等大对象时，URL 超过浏览器/服务器限制

**正确做法：**
- API 端创建数据库记录，返回 ID
- 前端跳转到详情页，详情页从数据库读取数据
- 避免在 URL 中传递业务数据

### 5. 技能工具调用规范

**教训：** 使用 Write 工具时必须提供 `file_path` 参数，不能遗漏。

**正确调用：**
```
Write(file_path: "path/to/file.md", content: "...")
```

### 6. 调试流程优化

**有效流程：**
1. 先用 `curl`/PowerShell `Invoke-WebRequest` 测试 API 端点，隔离前端问题
2. 查看 dev server 日志确认编译和请求状态
3. 修复后观察日志确认 200 响应
4. 最后让用户在浏览器验证

### 7. 防幻觉机制前置设计

**价值：** 在阶段3规划中，"待确认项"（uncertainItems）机制是防幻觉的核心体现 - AI 不能自行决定改写，必须询问用户。这种设计避免了 AI 编造经历的风险。

---

## 三、当前状态

### 已修复的 Bug
- ✅ 注册失败（CloudBase SDK 选择错误）
- ✅ Dashboard 运行时错误（next-intl async 组件）
- ✅ Word 文本提取失败（mammoth 参数错误）
- ✅ HTTP 431（URL 传大数据）

### 待完成的工作
- ⏳ 阶段3实现计划文档未成功保存（Write 工具参数错误）
- ⏳ 阶段3的 16 个任务待执行
- ⏳ 后续阶段4-6 待规划

### 下一步行动
1. 重新保存阶段3实现计划到 `docs/superpowers/plans/2026-06-17-mycareer-phase3-jd-tailor.md`
2. 使用 `subagent-driven-development` 或 `executing-plans` skill 执行计划
3. 端到端测试 JD 匹配与定制简历流程
