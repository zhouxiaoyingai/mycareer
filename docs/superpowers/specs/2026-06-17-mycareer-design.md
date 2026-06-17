# 求职助手（MyCareer）设计文档

> **版本**：v1.0
> **日期**：2026-06-17
> **状态**：已确认，待编写实现计划
> **来源**：基于 `e:\mycareer\初始需求.md` 深度访谈后设计

---

## 一、项目概述

### 1.1 项目定位

面向求职者的求职助手 Web 应用，支持 PC 和手机访问。提供简历生成、JD 匹配定制、打招呼话术生成、模拟面试演练等核心能力，帮助求职者高效准备投递与面试。

### 1.2 核心价值

- **防幻觉简历生成**：基于用户真实素材，不编造数字/项目，三维度防 AI 味
- **JD 定制化**：针对具体岗位生成定制简历，匹配度可视化
- **全流程覆盖**：从简历 → JD 匹配 → 打招呼 → 面试演练 → 投递记录一站式
- **中英双版**：独立重写（非翻译），适配国内/出海求职

### 1.3 MVP 功能范围

| 模块 | 功能 |
|------|------|
| 简历生成 | 4 种输入方式 + STAR 原则 + 中英双版标准简历 |
| JD 匹配 | 粘贴 JD → 匹配度分析 → 定制化简历 |
| 打招呼话术 | 基于简历+JD 生成招聘 App 打招呼消息 |
| 模拟面试 | 4 类面试题 + 文字答题 + AI 评分对比 |
| 投递记录 | 简单投递管理（公司/岗位/状态） |
| 简历管理 | 多版本管理 + PDF 导出 |

---

## 二、技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| **前端** | Next.js 14+ (App Router) + React + TypeScript | 部署到 EdgeOne Pages |
| **样式** | Tailwind CSS + shadcn/ui | 浅色友好风，响应式 |
| **后端** | Next.js API Routes (Node.js Runtime) | 同项目内 |
| **数据库** | 腾讯云 CloudBase（NoSQL 文档型） | 存用户/简历/JD/面试/投递 |
| **认证** | CloudBase Auth（邮箱密码） | 自带会话管理 |
| **文件存储** | CloudBase Storage | 存上传的 PDF/Word 简历 |
| **AI** | DeepSeek API | 平台统一 Key，服务端调用 |
| **PDF 导出** | Puppeteer（服务端） | 生成 ATS 友好 PDF，支持复杂排版 |
| **部署** | EdgeOne Pages | 连接 Gitee 仓库自动部署 |
| **i18n** | next-intl | 中英双语切换 |
| **测试** | Jest + React Testing Library + Playwright | 单元/集成/E2E |

### 2.1 部署架构

```
本地开发 → Git push 到 Gitee → EdgeOne Pages 自动构建部署
                              ↓
                    Next.js SSR/ISR + API Routes
                              ↓
                    CloudBase (DB + Auth + Storage)
                              ↓
                    DeepSeek API (AI 调用)
```

### 2.2 目录结构

```
mycareer/
├── app/
│   ├── (auth)/                    # 认证路由组
│   │   ├── login/
│   │   └── register/
│   ├── (main)/                    # 主功能路由组（需登录）
│   │   ├── dashboard/             # 首页仪表盘
│   │   ├── resume/                # 简历模块
│   │   │   ├── upload/            # 上传/输入初始简历
│   │   │   ├── standard/          # 标准版生成与查看
│   │   │   └── tailored/          # 定制版（基于JD）
│   │   ├── jd/                    # JD 匹配模块
│   │   │   ├── input/             # 粘贴 JD
│   │   │   └── match/             # 匹配度分析
│   │   ├── greeting/              # 打招呼话术
│   │   ├── interview/             # 模拟面试
│   │   │   ├── questions/         # 面试题生成
│   │   │   └── practice/          # 答题演练
│   │   └── applications/          # 投递记录
│   ├── api/                       # API Routes
│   │   ├── auth/                  # 认证 API
│   │   ├── resume/                # 简历相关 API
│   │   ├── jd/                    # JD 相关 API
│   │   ├── greeting/              # 打招呼 API
│   │   ├── interview/             # 面试 API
│   │   └── applications/          # 投递记录 API
│   └── layout.tsx
├── lib/
│   ├── ai/                        # AI 调用层
│   │   ├── deepseek.ts            # DeepSeek 客户端
│   │   ├── prompts/               # 提示词模板
│   │   └── anti-hallucination.ts  # 防幻觉机制
│   ├── db/                        # CloudBase 数据访问层
│   ├── auth/                      # 认证工具
│   ├── pdf/                       # PDF 导出
│   └── i18n/                      # 国际化
├── components/
│   ├── ui/                        # 基础 UI 组件（shadcn）
│   ├── resume/                    # 简历相关组件
│   ├── jd/                        # JD 相关组件
│   ├── interview/                 # 面试相关组件
│   └── layout/                    # 布局组件
├── types/                         # TypeScript 类型定义
└── docs/                          # 文档
```

---

## 三、数据模型

基于 CloudBase NoSQL 文档型数据库设计集合（Collections）。

### 3.1 集合结构

#### users（用户）

```typescript
{
  _id: string;
  email: string;           // unique
  passwordHash: string;
  displayName: string;
  preferredLang: 'zh' | 'en';
  createdAt: Date;
  updatedAt: Date;
}
```

#### resumes（简历）

```typescript
{
  _id: string;
  userId: string;          // 索引
  type: 'master' | 'standard' | 'tailored';
  parentId?: string;       // tailored 版本指向 standard 版本
  sourceType: 'upload_pdf' | 'upload_word' | 'paste' | 'form' | 'ai_chat';
  sourceFileId?: string;   // CloudBase Storage 文件ID
  rawContent: string;      // 原始文本
  structured: {
    contact: { name, email, phone, location, ... };
    summary: string;
    experiences: [{ company, title, startDate, endDate, bullets, ... }];
    projects: [{ name, role, description, bullets, ... }];
    education: [{ school, degree, major, startDate, endDate, ... }];
    skills: { technical: [], languages: [], ... };
    certifications: [];
  };
  targetRole?: string;     // 目标岗位（standard 版本）
  jdId?: string;           // 关联的 JD（tailored 版本）
  content: {
    zh: string;            // 中文版 Markdown
    en: string;            // 英文版 Markdown
  };
  provenance: [{           // 追溯信息（防幻觉）
    field: string;
    fromOriginal: string;  // 原始素材片段
    rewriteAction: string; // 改写动作
    hallucinationRisk: 'low' | 'medium' | 'high';
  }];
  aiFlavorScore: number;   // AI 味检测分数
  status: 'draft' | 'confirmed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
```

#### jds（岗位描述）

```typescript
{
  _id: string;
  userId: string;          // 索引
  company: string;
  position: string;
  rawContent: string;      // 原始 JD 文本
  parsed: {
    responsibilities: string[];
    requirements: {
      hardSkills: [{ name, weight }];    // 权重 0.7-1.0
      softSkills: [{ name, weight }];    // 权重 0.3-0.5
      industryTerms: [{ name, weight }]; // 权重 0.5-0.9
    };
    roleFamily: 'tech' | 'biz' | 'design' | 'ops';
    seniority: 'junior' | 'mid' | 'senior' | 'lead';
    location?: string;
  };
  matchScore?: number;     // 与简历的匹配度
  matchDetails?: {
    matched: [{ resumeField, jdKeyword, weight }];
    missing: [{ jdKeyword, weight }];
    suggestions: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### greetings（打招呼话术）

```typescript
{
  _id: string;
  userId: string;          // 索引
  resumeId: string;
  jdId: string;
  content: string;         // 生成的话术
  highlights: string[];    // 突出的优势
  matchPoints: string[];   // 与 JD 的匹配点
  createdAt: Date;
  updatedAt: Date;
}
```

#### interviews（面试会话）

```typescript
{
  _id: string;
  userId: string;          // 索引
  resumeId: string;
  jdId: string;
  questionTypes: ('technical' | 'behavioral' | 'case' | 'general')[];
  questions: [{
    id: string;
    type: 'technical' | 'behavioral' | 'case' | 'general';
    question: string;
    referenceAnswer: string;
    answerStrategy: string;
    userAnswer?: string;
    score?: number;
    feedback?: string;
    comparison?: string;
  }];
  overallScore?: number;
  status: 'generated' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

#### applications（投递记录）

```typescript
{
  _id: string;
  userId: string;          // 索引
  company: string;
  position: string;
  jdId?: string;
  resumeId: string;
  greetingId?: string;
  interviewId?: string;
  status: 'prepared' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'closed';
  appliedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 关系图

```
users (1) ──── (N) resumes
              ──── (N) jds
              ──── (N) greetings
              ──── (N) interviews
              ──── (N) applications

resumes (master/standard) ──派生──> resumes (tailored)
resumes (tailored) ──关联──> jds
greetings ──关联──> resumes + jds
interviews ──关联──> resumes + jds
applications ──关联──> resumes + jds + greetings + interviews
```

### 3.3 索引设计

| 集合 | 索引字段 | 用途 |
|------|---------|------|
| users | email (unique) | 登录查询 |
| resumes | userId + type | 按用户查简历 |
| resumes | userId + status | 查活跃简历 |
| resumes | parentId | 查派生版本 |
| jds | userId | 按用户查 JD |
| greetings | userId + jdId | 按 JD 查话术 |
| interviews | userId + status | 查进行中面试 |
| applications | userId + status | 按状态查投递 |

---

## 四、核心业务流程

### 4.1 简历生成主流程（两步式）

#### Step 1: 初始简历输入

用户选择输入方式：
- **a) 上传 PDF/Word** → CloudBase Storage → 文本提取（pdfplumber/pdftotext）
- **b) 在线表单填写** → 结构化数据
- **c) 复制粘贴文本** → AI 解析结构化
- **d) AI 对话引导** → 逐步收集经历（SSE 流式）

输出：master 简历（structured + rawContent），status = 'draft'

#### Step 2: 生成标准版简历（无 JD）

**Preflight 询问（一次性）：**
1. 模板风格：STAR / 项目导向 / 技能导向 / 混合
2. 长度：1页 / 2页 / 自动
3. 语言：中文 / 英文 / 中英双版

**AI 处理：**
- 按 STAR 原则整理经历
- 量化数据检查（无数字 → 占位符 `____%`，不编造）
- 防 AI 味检测（黑名单过滤）
- 中英双版独立重写（非翻译）
- 生成 provenance 追溯信息

输出：standard 简历（content.zh + content.en），status = 'confirmed'（用户确认后）

#### Step 3: JD 定制（可选，用户粘贴 JD 时触发）

**输入：** JD 文本 + 选定的 standard 简历

**AI 处理：**
1. 解析 JD → 提取硬技能/软技能/行业术语 + 权重
2. 匹配度分析 → matchScore + matchDetails
3. 定制化重写：
   - 调整 bullet 顺序（JD 优先级高的前置）
   - 合法改写（仅 11 种允许动作）
   - 不确定的地方 → 问用户，不编造
4. 生成 provenance + hallucinationRisk 标注
5. 防幻觉审核（medium+ 风险项需用户确认）

输出：tailored 简历（parentId 指向 standard）

### 4.2 打招呼话术生成

**触发：** 用户在 tailored 简历页面点击"生成打招呼话术"
**输入：** tailored 简历 + 关联 JD

**AI 处理：**
1. 提取简历核心优势（3-5 条，基于 JD 优先级）
2. 提取与 JD 的匹配点（2-3 条）
3. 生成 50-100 字打招呼话术：
   - 开头：简短自我介绍（岗位 + 年限）
   - 中间：突出 1-2 个与 JD 最匹配的优势
   - 结尾：表达兴趣 + 行动号召
4. 防止过度营销感（避免"赋能/打造/闭环"等 AI 味词）

**输出：** greeting 记录（content + highlights + matchPoints）

### 4.3 模拟面试

#### Step 1: 生成面试题

**输入：** JD + 简历 + 选题型（技术/行为/案例/通用，可多选）

**AI 生成（从面试官角度）：**
- **技术题**：基于 JD 技术栈（如"说说 React Fiber 架构"）
- **行为题**：基于简历经历的 STAR 题（如"讲一个你主导的项目"）
- **案例题**：基于 JD 场景（如"设计一个高并发登录系统"）
- **通用题**：自我介绍/职业规划/离职原因等

每题包含：
- question: 题目
- referenceAnswer: 参考答案（基于简历 + 通用最佳实践）
- answerStrategy: 答题思路（STAR 框架/技术要点）

输出：interview 记录（status = 'generated'）

#### Step 2: 用户答题演练

用户逐题作答（文字输入）

**AI 评分（每题）：**
- score: 0-100
- feedback: 评分理由（优点 + 不足）
- comparison: 与参考答案的对比分析

**全部答完后：**
- overallScore: 综合评分
- 整体反馈 + 改进建议
- status = 'completed'

### 4.4 投递记录管理

**用户操作：**
- 新建投递记录：公司 + 岗位 + 关联 JD/简历/话术/面试
- 更新状态：prepared → applied → interviewing → offer/rejected
- 添加备注

**仪表盘展示：**
- 投递总数 + 各状态统计
- 最近活动
- 快捷入口

### 4.5 简历查看与调整

**查看：**
- 列表页：所有简历版本（master/standard/tailored）
- 详情页：中英双版切换查看 + provenance 追溯

**调整：**
- 用户手动编辑 Markdown 内容
- 基于 JD 重新生成（refine 模式）
- 导出 PDF（ATS 友好格式）

---

## 五、AI 提示词设计

### 5.1 提示词文件结构

```
lib/ai/prompts/
├── resume-parse.ts          # 简历解析（输入→结构化）
├── resume-generate.ts       # 标准版生成（STAR + 中英双版）
├── resume-tailor.ts         # JD 定制（匹配 + 重写）
├── jd-parse.ts              # JD 解析（提取关键词+权重）
├── greeting-generate.ts     # 打招呼话术
├── interview-generate.ts    # 面试题生成
├── interview-score.ts       # 答题评分
└── shared/
    ├── anti-hallucination.ts  # 防幻觉规则注入
    ├── ai-flavor-check.ts     # AI 味检测
    └── provenance-rules.ts    # 追溯规则
```

### 5.2 关键提示词原则

- 系统提示词注入防幻觉三维度规则
- 输出强制 JSON schema（便于解析）
- 中英双版独立重写（非翻译）
- 每条 bullet 附 provenance 追溯

---

## 六、防幻觉机制

### 6.1 三维度防幻觉（沿用现有简历助手 Skill）

#### 维度 1: 不编造事实

- 数字/项目/技术栈一律不可凭空补
- 无量化数据 → 生成 `____%` 占位符让用户填
- 联系信息未提供 → 占位符 `[电话待填写]`
- 任何推断标记 `hallucinationRisk: 'high'` + 强制用户审核

#### 维度 2: 合法改写（仅 11 种动作）

- `verb_upgrade`: 动词升级（参与→协助）
- `quantification_add`: 添加量化（仅当原文有数字）
- `bullet_reorder`: 调整顺序
- `keyword_align`: 关键词对齐 JD
- ...（完整 11 种见 `provenance-rules.ts`）
- 其他动作视为违规

#### 维度 3: 防 AI 味

- 中文黑名单：赋能/打造/夯实/抓手/闭环/心智/颗粒度/组合拳 等 20+ 词
- 英文黑名单：spearheaded/orchestrated/leveraged/utilized/synergy 等 53 词
- 命中 ≥6 次必须强制修改
- `aiFlavorScore` 记录在简历记录中

### 6.2 用户审核环节（不可跳过）

- `hallucinationRisk ≥ medium` 的条目逐项展示
- AI 文风命中 ≥6 次的 bullet 必须确认
- 占位符在最终输出高亮列出

---

## 七、UI/UX 设计

### 7.1 设计风格

**浅色友好风（Notion/Airbnb 启发）**

### 7.2 色彩系统

```
背景：#FFFFFF（主）/ #F7F7F5（次）
文字：#1F1F1F（主）/ #6B6B6B（次）/ #999999（弱）
强调色：#0066FF（主，链接/按钮）/ #00A950（成功）/ #FF6B35（警告）
边框：#E5E5E2
卡片：#FFFFFF + 1px border + 8px radius + subtle shadow
```

### 7.3 字体

```
中文：PingFang SC / Microsoft YaHei
英文：Inter / SF Pro
代码：JetBrains Mono
```

### 7.4 布局

```
PC：左侧导航栏（240px）+ 主内容区（max-width 1200px）
手机：底部 Tab 栏 + 全屏内容
响应式断点：sm(640) / md(768) / lg(1024) / xl(1280)
```

### 7.5 页面结构

```
/login, /register              # 认证页（居中卡片）
/dashboard                     # 仪表盘（统计卡片 + 快捷入口）
/resume/upload                 # 简历输入（4 种方式 Tab 切换）
/resume/standard/[id]          # 标准版查看（中英切换 + 编辑 + 导出）
/resume/tailored/[id]          # 定制版查看（+ JD 匹配详情）
/jd/input                      # JD 粘贴
/jd/match/[id]                 # 匹配度分析（雷达图 + 差距列表）
/greeting/[id]                 # 打招呼话术（可复制）
/interview/questions/[id]      # 面试题列表
/interview/practice/[id]       # 答题演练（逐题作答）
/applications                  # 投递记录（列表 + 状态筛选）
```

---

## 八、API 设计

### 8.1 认证

```
POST   /api/auth/register        # 注册
POST   /api/auth/login           # 登录
POST   /api/auth/logout          # 登出
GET    /api/auth/me              # 当前用户
```

### 8.2 简历

```
POST   /api/resume/upload        # 上传文件简历
POST   /api/resume/parse         # 解析文本/表单
POST   /api/resume/chat          # AI 对话引导（SSE 流式）
GET    /api/resume/list          # 列表
GET    /api/resume/:id           # 详情
POST   /api/resume/:id/generate-standard  # 生成标准版
POST   /api/resume/:id/tailor    # 生成定制版（需 JD）
PUT    /api/resume/:id           # 编辑
POST   /api/resume/:id/export-pdf # 导出 PDF
DELETE /api/resume/:id           # 删除
```

### 8.3 JD

```
POST   /api/jd/parse             # 解析 JD
GET    /api/jd/list
GET    /api/jd/:id
POST   /api/jd/:id/match         # 匹配度分析（需简历ID）
DELETE /api/jd/:id
```

### 8.4 打招呼

```
POST   /api/greeting/generate    # 生成话术（需简历ID + JDID）
GET    /api/greeting/list
GET    /api/greeting/:id
```

### 8.5 面试

```
POST   /api/interview/generate   # 生成面试题
GET    /api/interview/list
GET    /api/interview/:id
POST   /api/interview/:id/answer # 提交答案
POST   /api/interview/:id/complete # 完成面试
```

### 8.6 投递记录

```
GET    /api/applications
POST   /api/applications
PUT    /api/applications/:id
DELETE /api/applications/:id
```

---

## 九、错误处理

### 9.1 统一错误响应格式

```json
{
  "error": {
    "code": "RESUME_NOT_FOUND" | "AI_API_ERROR" | "VALIDATION_ERROR" | ...,
    "message": "用户友好的错误描述",
    "details": { ... }
  }
}
```

### 9.2 关键错误处理

- AI API 调用失败 → 重试 3 次 + 友好提示
- AI 返回格式异常 → 降级处理 + 记录日志
- 文件上传失败 → 提示重试
- 认证过期 → 自动跳转登录
- 防幻觉审核未通过 → 阻断生成 + 提示用户确认

---

## 十、测试策略

### 10.1 单元测试（Jest + React Testing Library）

- `lib/ai/prompts/` 提示词生成
- `lib/anti-hallucination` 防幻觉检测
- `lib/db` 数据访问层
- `components/` UI 组件

### 10.2 集成测试

- API Routes 端到端
- AI 调用 + 防幻觉 + 数据存储全流程

### 10.3 E2E 测试（Playwright）

- 注册登录
- 上传简历 → 生成标准版
- 粘贴 JD → 生成定制版
- 生成打招呼话术
- 生成面试题 → 答题 → 评分

### 10.4 关键测试场景

- 防幻觉：AI 不能编造数字
- AI 味检测：命中黑名单词必须拦截
- 中英双版：独立生成非翻译
- 响应式：PC + 手机布局

---

## 十一、能力边界（不在 MVP 范围）

- **花哨视觉模板**：仅支持 ATS 友好 PDF 导出，不提供彩条/时间轴等视觉模板（用 Reactive Resume / Enhancv）
- **求职跟踪/自动投递**：仅提供简单投递记录，不自动投递（用 Teal / 招聘平台内嵌工具）
- **扫描件 OCR**：不支持扫描件/图片 PDF 的 OCR（幻觉率高），仅支持文本层 PDF
- **纯翻译**：中英双版是本土化重写而非翻译
- **完整面试题库**：仅基于 JD + 简历生成针对性面试题，不提供完整公司题库
- **语音面试**：MVP 仅支持文字问答，语音面试后续迭代
- **社交登录**：MVP 仅支持邮箱密码，社交登录后续迭代

---

## 十二、参考资源

- **简历助手 Skill**：`e:\mycareer\简历助手\`（防幻觉机制、Provenance 规则、ATS 规则、AI 味黑名单等）
- **设计风格参考**：`e:\mycareer\awesome-design-md\`（Notion、Airbnb 等浅色友好风格）
- **EdgeOne Pages 文档**：https://edgeone.cloud.tencent.com/pages/document
- **CloudBase 文档**：https://cloud.tencent.com/document/product/876
- **DeepSeek API 文档**：https://platform.deepseek.com/api-docs
