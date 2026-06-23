# 优势识别功能设计规格

**状态**：已批准
**版本**：V1.0
**最后更新**：2026-06-23

---

## 1. 产品结构

### 1.1 URL 架构

```
/discover                    # 优势识别主页（问卷 + 报告，同页面状态切换）
/discover/history            # 历史版本列表
左侧导航 Tab → /discover
Dashboard 引导卡片 → 跳转 /discover
```

### 1.2 Dashboard 引导入口

在 Dashboard 新增引导模块：
- 用户无历史报告时：显示"发现你的职业可能性"引导卡片
- 用户有历史报告时：显示最近报告摘要 + "重新探索"按钮

### 1.3 报告页行为

问卷完成后在同页面切换到报告展示（SPA 路由），不跳转新 URL。

---

## 2. 问卷设计

### 2.1 问题流程

| # | 问题 | 形式 | 数据字段 |
|---|------|------|---------|
| 1 | 你现在处于哪个阶段？ | 单选（5项） | `currentStage` |
| 2 | 最近一次觉得"时间过得很快、做得很投入"是什么时候？ | 卡片多选（最多3个） | `flowExperiences[]` |
| 3 | 以下哪件事最让你有成就感？ | 单选 + 可选文本 | `achievementType` + `achievementStory` |
| 4 | 你理想中的工作环境是什么样的？ | 5维度量表（1-5分） | `workEnvironmentPreferences{}` |
| 5 | 以下三件事，如果只能选一个长期拥有，你选哪个？ | 强制排序（6项） | `valueRanking[]` |
| 6 | 想象你需要从零开始学习一个新领域，可能半年内收入降低，你会怎么做？ | 情境题（单选） | `riskTolerance` |
| 7（选填） | 你通常是怎么学会一件新事物的？ | 多选（最多2个） | `learningStyle[]` |

### 2.2 设计原则

1. **最小认知负荷**：控制在 5-7 个问题，单页单题卡片式
2. **成就行销**：通过"心流体验"和"成就事件"间接定位内在动机
3. **零评判安全感**：选项设计去职业歧视化
4. **身份认同锚定**：问题持续提供"你是一个做XX事的人"的身份暗示
5. **认知留白**：Q7 和成就文本框设计为选填

### 2.3 交互要点

- Q3→Q4 之间插入缓冲文案："休息一下——接下来的问题关于你理想的工作方式，不是关于你的过去"
- Q4 完成后展示结果预览钩子："我们已经发现你有一种特质... 完成剩余3题，获取完整报告"
- 进度条赋义：不用"3/7"，而是"你已经发现了你的动力来源"
- 退出挽留：引用用户已回答内容制造损失感

### 2.4 预填充逻辑

用户进入 `/discover` 时：
1. 检查用户是否有 master/standard 类型简历
2. 若有，从 structured 数据提取 yearsOfExperience、skills 等
3. 预填充到对应字段，用户可确认或修改
4. 无简历也可完整作答，不强制依赖

---

## 3. 数据结构

### 3.1 集合：strength_reports

```typescript
interface StrengthReport {
  _id: string;
  userId: string;
  status: "in_progress" | "completed";  // 进行中 / 已完成
  createdAt: Date;
  updatedAt: Date;

  // 问卷原始答案快照
  answers: {
    currentStage: string;
    careerClarity?: string;           // Q1 拆分出的独立维度
    flowExperiences: string[];
    achievementType: string;
    achievementStory?: string;
    workEnvironmentPreferences: {
      remoteWork: number; stability: number; fastPaced: number;
      teamwork: number; independence: number; creativity: number;
    };
    valueRanking: string[];           // 6项排序
    riskTolerance: string;
    learningStyle?: string[];
    yearsOfExperience: number;        // 预填充自简历
  };

  // AI 生成的报告内容
  report: {
    transferableSkills: Array<{
      skill: string;
      transferTo: string;
      evidence: string;
    }>;
    careerPaths: Array<{
      careerName: string;
      industry: string;
      skillMatch: string;
      entryPath: string;
      salaryRange: string;       // "仅供参考"
      searchStrategy: string;    // 搜索策略，非具体链接
      transitionTime: string;
    }>;
    quickWins: Array<{
      step: string;
      resource: string;
      purpose: string;
    }>;
    realityCheck: {
      bestFit: string;
      timelines: Array<{ path: string; phase: string; duration: string }>;
    };
    generatedAt: Date;
    version: number;             // 重新作答后 version+1
  };
}
```

**状态说明**：`status: "in_progress"` 在问卷提交后、AI 开始生成前写入，生成完成后更新为 `"completed"`。即使 AI 生成失败，已填写的问卷答案不丢失。

---

## 4. API 设计

### 4.1 新增 API 路由

```
POST /api/strength/reports
  Body: { answers: {...} }
  Response: { id: string, status: "in_progress" }
  说明：创建问卷记录，启动 AI 流式生成

GET /api/strength/reports
  Query: ?limit=10&offset=0
  Response: { reports: StrengthReport[], total: number }
  说明：获取用户历史报告列表（按 createdAt 倒序）

GET /api/strength/reports/:id
  Response: StrengthReport
  说明：获取某次报告详情

DELETE /api/strength/reports/:id
  Response: { success: true }
  说明：删除某次报告
```

### 4.2 流式生成流程

1. `POST /api/strength/reports` 创建记录（`status: "in_progress"`）
2. 前端通过 `fetch` 流式消费 DeepSeek API 返回
3. AI 报告内容分段写入 `report` 字段，完成后 `status: "completed"`
4. 前端实时渲染流式输出（类似 ChatGPT）
5. DeepSeek 超时 30 秒，返回错误，前端显示"分析超时，请重试"

### 4.3 Prompt 模块

新建 `lib/ai/prompts/strength-analyze.ts`：
- 输入：用户答案 JSON
- 输出：流式 JSON 片段，逐步拼装为 `report` 对象
- 约束：薪资注明"仅供参考"、不提供具体链接、不知道说"暂无数据"

---

## 5. 页面与组件

### 5.1 新增文件

```
app/(main)/discover/
  page.tsx                 # 问卷 + 报告页面（SPA 状态切换）
components/
  discover/
    questionnaire-card.tsx  # 单题卡片组件
    progress-bar.tsx       # 进度条（含里程碑文案）
    report-view.tsx        # 报告展示组件
    dashboard-widget.tsx   # Dashboard 引导卡片
    history-list.tsx       # 历史版本列表
lib/ai/prompts/
  strength-analyze.ts      # AI 分析 Prompt
```

### 5.2 页面状态机

```
idle         → 用户进入，显示问卷
answering    → 用户在回答问题
submitting   → 用户提交问卷，调 API
generating   → AI 流式生成报告，前端渲染输出
completed    → 报告生成完毕
error        → 生成失败，显示重试按钮
```

### 5.3 Dashboard 引导卡片

- 无历史报告：显示"发现你的职业可能性"引导卡片，点击跳转 `/discover`
- 有历史报告：显示最近报告摘要 + "重新探索"按钮

---

## 6. 错误处理

| 场景 | 处理方式 |
|------|---------|
| AI 流式中断 | 保留 `status: "in_progress"`，显示"生成中断，是否重试？" |
| 问卷中途关闭 | 答案在 `localStorage` 暂存（每题回答后自动保存），重新进入从上次位置继续 |
| 用户未登录 | 中间件保护，未登录跳转 `/login?redirect=/discover` |
| DeepSeek API 超时 | 30秒超时，返回错误，前端提示"分析超时，请重试" |

---

## 7. 成功指标

| 指标 | 目标值 |
|------|--------|
| 问卷完成率 | ≥ 70% |
| AI 报告满意度 | ≥ 3.8/5 |
| 后续转化率 | 使用后 7 天内创建简历 ≥ 20% |
| 平均完成时长 | 3-5 分钟 |

---

## 8. 开发顺序

1. `lib/ai/prompts/strength-analyze.ts` — Prompt 模块
2. `POST /api/strength/reports` — 创建记录 + 流式生成
3. `GET /api/strength/reports` — 历史列表
4. `app/(main)/discover/page.tsx` — 问卷 + 报告页面
5. `components/discover/` — 各组件
6. Dashboard 引导卡片
7. 退出挽留、中途保存等微交互