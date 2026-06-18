# 阶段4设计文档：打招呼短文功能

**日期**：2026-06-17
**状态**：已批准
**关联需求**：初始需求功能4 — "生成一段简短的打招呼的话，突出自己的优势以及和JD匹配度，引起招聘方的兴趣"

## 1. 背景与目标

阶段3已完成 JD 解析→定制简历→待确认项审核全链路。阶段4在此基础上增加"打招呼短文"功能，与定制简历形成完整求职闭环：简历→JD匹配→定制简历→打招呼话术。

**目标**：用户生成定制简历时，AI 同时生成一段 50-100 字的中文打招呼短文，突出用户优势与 JD 匹配点，适合在 BOSS 直聘、拉勾等平台私信招聘方。

## 2. 需求决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 生成时机 | 随定制简历一起生成 | 一次 AI 调用，上下文一致 |
| 内容形式 | 中文短文本（50-100字） | 适合主流招聘平台私信 |
| 存储方式 | 嵌入定制简历文档 | 简化数据模型，与简历生命周期一致 |
| 展示方式 | 多处展示 | 简历详情页 + 待确认项审核页 |
| 重新生成 | 支持 | 独立 API，基于已有 matchAnalysis 重新生成 |

## 3. 方案选择：混合方案

- **首次生成**：扩展 `resume-tailor` 提示词，AI 一次调用同时生成定制简历 + 打招呼短文
- **重新生成**：独立 API `POST /api/resumes/[id]/greeting`，基于已有 `matchAnalysis` 重新生成

**选择理由**：兼顾首次生成的一致性（同一上下文）和重新生成的低成本（不影响定制简历）。

## 4. 数据模型

### 4.1 Resume 接口扩展

在 `types/resume.ts` 的 `Resume` 接口新增字段：

```typescript
greeting?: {
  text: string;           // 打招呼短文（50-100字）
  generatedAt: Date;      // 生成时间
  version: number;        // 版本号，重新生成时 +1
};
```

### 4.2 数据访问层扩展

`lib/cloudbase/resumes.ts` 的 `UpdateResumeInput` 新增 `greeting` 字段。

## 5. 提示词扩展

### 5.1 resume-tailor 提示词

在 `lib/ai/prompts/resume-tailor.ts` 中：

1. `ResumeTailorResult` 接口新增 `greeting` 字段：
```typescript
greeting: {
  text: string;  // 50-100字中文打招呼短文
};
```

2. 系统提示词新增打招呼短文生成要求：
- 基于匹配度分析（matchAnalysis）生成
- 突出用户核心优势（2-3个）
- 突出与 JD 的匹配点（2-3个）
- 字数严格控制在 50-100 字
- 语气自然、专业、引起兴趣
- 避免过度自夸和 AI 味

3. `parseResumeTailorResult` 函数新增 `greeting` 字段解析。

### 5.2 greeting-regenerate 提示词

新增 `lib/ai/prompts/greeting.ts`：

```typescript
export const GREETING_SYSTEM_PROMPT = injectAntiHallucinationRules(`
基于以下信息生成一段 50-100 字的中文打招呼短文：

## JD 信息
{jdStructured}

## 用户简历匹配分析
{matchAnalysis}

## 生成要求
1. 突出用户核心优势（2-3个）
2. 突出与 JD 的匹配点（2-3个）
3. 字数严格 50-100 字
4. 语气自然、专业、引起兴趣
5. 避免过度自夸和 AI 味
6. 输出 JSON：{"text": "打招呼短文"}
`);
```

## 6. API 设计

### 6.1 首次生成（扩展现有 API）

**API**：`POST /api/jds/[id]/tailor`（已有）
**变更**：返回结果新增 `greeting` 字段，并写入简历文档。

### 6.2 重新生成（新增 API）

**API**：`POST /api/resumes/[id]/greeting`
**功能**：基于已有定制简历的 `matchAnalysis` 重新生成打招呼短文
**请求体**：无
**响应**：
```json
{
  "success": true,
  "data": {
    "greeting": {
      "text": "您好，我是有5年前端经验...",
      "generatedAt": "2026-06-17T...",
      "version": 2
    }
  }
}
```

**错误处理**：
- 简历不存在/无权访问 → 404
- 简历非 tailored 类型 → 400
- 简历无 matchAnalysis → 400（需先生成定制简历）
- AI 调用失败 → 502

## 7. 前端页面

### 7.1 定制简历详情页

**文件**：`app/(main)/resume/[id]/page.tsx`
**新增**：当 `resume.type === "tailored"` 且存在 `greeting` 时，显示"打招呼话术"卡片：
- 卡片标题："打招呼话术"
- 显示 `greeting.text`
- 显示版本号和生成时间
- "复制"按钮（使用 `navigator.clipboard`）
- "重新生成"按钮（调用 `POST /api/resumes/[id]/greeting`，loading 状态，成功后更新）

### 7.2 待确认项审核页

**文件**：`app/(main)/resume/[id]/confirm/page.tsx`
**新增**：页面顶部显示打招呼话术卡片（只读 + 复制按钮），让用户在审核待确认项时同步查看。

## 8. 错误处理与降级

- **首次生成时打招呼短文失败**：不影响定制简历主流程，`greeting` 字段为空，前端不显示卡片
- **重新生成失败**：显示原内容 + 错误提示 toast
- **AI 返回字数不符**：提示词严格要求，解析时不强制截断（避免语义不完整）

## 9. 测试策略

### 9.1 单元测试

- `parseResumeTailorResult` 正确解析 `greeting` 字段
- `greeting` 字段缺失时降级处理
- greeting 提示词模板正确填充变量

### 9.2 API 测试

- `POST /api/resumes/[id]/greeting` 成功重新生成
- 简历不存在 → 404
- 简历非 tailored → 400
- 简历无 matchAnalysis → 400

### 9.3 端到端测试

1. 生成定制简历 → 确认打招呼话术同时生成
2. 定制简历详情页 → 看到打招呼话术卡片
3. 点击复制 → 剪贴板包含正确文本
4. 点击重新生成 → 新话术生成，版本号 +1
5. 待确认项审核页 → 顶部显示打招呼话术

## 10. 范围边界

**本阶段包含**：
- 打招呼短文生成（首次 + 重新生成）
- 简历详情页和待确认项审核页展示
- 复制功能

**本阶段不包含**：
- 多风格变体（正式/轻松/简洁）
- 中英文双语
- 打招呼短文历史版本管理
- 独立的打招呼管理页面

## 11. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `types/resume.ts` | 修改 | 新增 `greeting` 字段 |
| `lib/cloudbase/resumes.ts` | 修改 | `UpdateResumeInput` 新增 `greeting` |
| `lib/ai/prompts/resume-tailor.ts` | 修改 | 扩展提示词和解析 |
| `lib/ai/prompts/greeting.ts` | 新增 | 重新生成打招呼短文提示词 |
| `app/api/jds/[id]/tailor/route.ts` | 修改 | 写入 `greeting` 字段 |
| `app/api/resumes/[id]/greeting/route.ts` | 新增 | 重新生成 API |
| `app/(main)/resume/[id]/page.tsx` | 修改 | 新增打招呼话术卡片 |
| `app/(main)/resume/[id]/confirm/page.tsx` | 修改 | 顶部显示打招呼话术 |
| `components/resume/greeting-card.tsx` | 新增 | 可复用的打招呼话术卡片组件 |
