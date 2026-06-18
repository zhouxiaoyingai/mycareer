# 阶段5：模拟面试功能 设计文档

> **版本**：v1.0
> **日期**：2026-06-18
> **状态**：已确认，待编写实现计划
> **来源**：基于 `初始需求.md` 和 `2026-06-17-mycareer-design.md` 深度访谈后设计

---

## 一、功能概述

### 1.1 目标

为求职者提供模拟面试演练能力：
1. 基于 JD + 简历，从面试官角度生成 8 道针对性面试题（含参考答案和答题思路）
2. 用户文字作答，AI 逐题评分（0-100）+ 反馈 + 与参考答案对比
3. 全部答完后生成整体评分和改进建议
4. 支持同一份题集多次答题，保留历史会话记录以对比进步

### 1.2 核心决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 触发入口 | JD 详情页 + 定制简历详情页 | 与打招呼话术入口一致，复用 JD 上下文 |
| 题目数量 | 8 题（技术3+行为2+案例1+通用2） | 覆盖全面且不过长 |
| 评分粒度 | 逐题评分 | 即时反馈，学习效果好 |
| 多次答题 | 支持 | 保留历史对比进步 |
| 数据模型 | 两集合分离（interviews + interview_sessions） | 结构清晰，题集可复用 |
| 关联简历 | 定制优先，否则标准版 | 定制简历与 JD 匹配度更高 |
| 答题输入 | 纯文本 | 简单实现，符合 MVP |

---

## 二、数据模型

### 2.1 interviews（面试题集）

不可变，生成后固定。

```typescript
{
  _id: string;
  userId: string;          // 索引
  resumeId: string;        // 关联简历
  jdId: string;            // 关联 JD
  // 冗余快照，避免简历/JD 修改后题目失真
  resumeSnapshot: {
    targetRole?: string;
    contentZh: string;     // 简历中文版内容
  };
  jdSnapshot: {
    title: string;
    company?: string;
    hardSkills: Array<{ name: string; weight: number }>;
  };
  questionTypes: ('technical' | 'behavioral' | 'case' | 'general')[];
  questions: [{
    id: string;            // 题目唯一 ID（如 q1, q2...）
    type: 'technical' | 'behavioral' | 'case' | 'general';
    question: string;      // 题目文本
    referenceAnswer: string; // 参考答案（基于简历真实经历）
    answerStrategy: string;  // 答题思路（STAR 框架/技术要点）
  }];
  status: 'generated' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 interview_sessions（答题会话）

每次答题新建一条。

```typescript
{
  _id: string;
  userId: string;          // 索引
  interviewId: string;     // 关联题集
  answers: [{
    questionId: string;    // 对应 interviews.questions[].id
    userAnswer: string;    // 用户答案
    score: number;         // 0-100
    feedback: string;      // 评分理由（优点 + 不足）
    comparison: string;    // 与参考答案的对比分析
    scoredAt: Date;
  }];
  overallScore?: number;   // 综合评分（全部答完后生成）
  overallFeedback?: string; // 整体反馈 + 改进建议
  status: 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 关系图

```
users (1) ──── (N) interviews（题集）
              ──── (N) interview_sessions（答题会话）

interviews (1) ──── (N) interview_sessions
interviews ──关联──> resumes + jds
interview_sessions ──关联──> interviews
```

### 2.4 索引

| 集合 | 索引字段 | 用途 |
|------|---------|------|
| interviews | userId | 按用户查题集 |
| interviews | userId + jdId | 按 JD 查题集 |
| interview_sessions | userId + interviewId | 按题集查会话 |

---

## 三、API 设计

### 3.1 面试题集

```
POST   /api/interviews              # 生成面试题（入参：jdId, resumeId?, questionTypes?）
GET    /api/interviews              # 列表（支持 ?jdId= 筛选）
GET    /api/interviews/[id]         # 题集详情（含题目）
DELETE /api/interviews/[id]         # 删除题集
```

### 3.2 答题会话

```
POST   /api/interviews/[id]/sessions              # 开始答题（新建会话）
GET    /api/interviews/[id]/sessions              # 会话列表
GET    /api/interviews/[id]/sessions/[sid]        # 会话详情
POST   /api/interviews/[id]/sessions/[sid]/answer # 提交单题答案（逐题评分）
POST   /api/interviews/[id]/sessions/[sid]/complete # 完成会话（生成整体评分）
```

### 3.3 请求/响应示例

**POST /api/interviews**（生成面试题）
```json
// 请求
{
  "jdId": "xxx",
  "resumeId": "xxx",  // 可选，不传则自动选定制优先
  "questionTypes": ["technical", "behavioral", "case", "general"]  // 可选，默认全选
}

// 响应
{
  "data": {
    "_id": "interview_id",
    "status": "generated",
    "questions": [...],
    "usage": { "totalTokens": 1234 }
  }
}
```

**POST /api/interviews/[id]/sessions/[sid]/answer**（提交单题答案）
```json
// 请求
{
  "questionId": "q1",
  "userAnswer": "我的答案是..."
}

// 响应
{
  "data": {
    "score": 85,
    "feedback": "优点：... 不足：...",
    "comparison": "与参考答案对比：...",
    "usage": { "totalTokens": 567 }
  }
}
```

---

## 四、提示词设计

### 4.1 文件结构

```
lib/ai/prompts/
├── interview-generate.ts    # 面试题生成
├── interview-score.ts       # 逐题评分
└── interview-overall.ts     # 整体评分
```

### 4.2 interview-generate.ts

**输入**：JD 结构化数据 + 简历内容
**输出**：8 题（技术3+行为2+案例1+通用2），每题含 question / referenceAnswer / answerStrategy

**提示词要点**：
- 从面试官角度出题
- 技术题基于 JD 技术栈（如"说说 React Fiber 架构"）
- 行为题基于简历经历的 STAR 题（如"讲一个你主导的项目"）
- 案例题基于 JD 场景（如"设计一个高并发登录系统"）
- 通用题：自我介绍/职业规划/离职原因等
- **防幻觉**：参考答案基于简历真实经历，不编造项目/数字

### 4.3 interview-score.ts

**输入**：题目 + 参考答案 + 用户答案 + 简历上下文
**输出**：score(0-100) + feedback(优点+不足) + comparison(对比分析)

**评分标准**：
- 90-100：答案完整、逻辑清晰、有量化数据、贴合岗位
- 70-89：答案较好但缺少细节或量化
- 50-69：答案基本相关但深度不足
- 0-49：答案偏离题目或过于简略

### 4.4 interview-overall.ts

**输入**：所有题目的评分 + 答案
**输出**：overallScore + overallFeedback + 改进建议

---

## 五、页面结构

### 5.1 路由

```
/interview                        # 面试列表页（题集列表 + 新建入口）
/interview/[id]                   # 题集详情页（题目列表 + 历史会话 + 开始答题按钮）
/interview/[id]/sessions/[sid]    # 答题演练页（逐题作答 + 即时评分）
```

### 5.2 触发入口

- **JD 详情页**（`/jd/[id]`）：新增"生成面试题"按钮
- **定制简历详情页**（`/resume/[id]`）：新增"生成面试题"按钮

### 5.3 面试列表页（/interview）

- 标题 + "生成面试题"按钮（跳转 /jd 选择 JD）
- 空状态：提示"还没有面试题集"+ 引导按钮
- 列表项：JD 标题/公司 + 题目数量 + 创建时间 + 历史会话数 + 最高分 + "查看详情"按钮

### 5.4 题集详情页（/interview/[id]）

- 顶部：JD 信息 + 简历信息 + "开始答题"按钮
- 中部：题目列表（折叠式，默认显示题目，点击展开参考答案和答题思路）
- 底部：历史会话列表（每次答题的分数 + 时间 + "查看详情"）

### 5.5 答题演练页（/interview/[id]/sessions/[sid]）

- 顶部：进度条（如 3/8）+ 当前题型 Badge
- 中部：当前题目 + 答案输入框（Textarea）+ "提交答案"按钮
- 提交后：显示分数 + 反馈 + 参考答案对比 + "下一题"按钮
- 最后一题答完：显示"完成演练"按钮 → 生成整体评分
- 完成后：显示整体评分 + 改进建议 + "返回题集"按钮

---

## 六、核心业务流程

### 6.1 生成面试题

1. 用户在 JD 详情页或定制简历详情页点击"生成面试题"
2. API 接收 jdId + resumeId（可选）
3. 若未传 resumeId，自动选择：优先该 JD 的定制简历，否则标准版简历
4. 获取 JD 结构化数据 + 简历内容
5. 调用 AI 生成 8 题（技术3+行为2+案例1+通用2）
6. 存储到 interviews 集合（含简历和 JD 快照）
7. 返回题集详情，跳转到 /interview/[id]

### 6.2 答题演练

1. 用户在题集详情页点击"开始答题"
2. 新建 interview_session（status = in_progress）
3. 跳转到答题页，逐题展示
4. 每题流程：
   - 显示题目 + 题型 Badge
   - 用户在 Textarea 输入答案
   - 点击"提交答案" → 调用 answer API
   - AI 评分（0-100）+ 生成反馈和对比
   - 显示评分结果 + 参考答案
   - 点击"下一题"继续
5. 最后一题答完 → 点击"完成演练"
6. 调用 complete API → AI 生成整体评分和改进建议
7. 显示整体结果 → 返回题集详情页

### 6.3 多次答题

- 同一题集可多次新建会话
- 每次会话独立评分
- 题集详情页展示所有历史会话，便于对比进步

---

## 七、防幻觉机制

### 7.1 参考答案防幻觉

- 参考答案基于简历真实经历，不编造项目/数字
- 若简历中无相关经历，参考答案标注"基于通用最佳实践"
- 禁止使用 AI 味词（赋能/打造/夯实等）

### 7.2 评分公正性

- 评分对比用户答案与参考答案，不偏袒
- feedback 客观指出优点和不足
- comparison 明确差异点

### 7.3 快照机制

- 简历和 JD 内容快照存入 interview 记录
- 避免简历/JD 修改后题目失真
- 评分时使用快照内容，保证一致性

---

## 八、错误处理

- AI API 调用失败 → 重试 3 次 + 友好提示
- AI 返回格式异常 → 降级处理 + 记录日志
- 题集不存在 → 404
- 会话不属于当前用户 → 403
- 会话已完成 → 拒绝提交答案

---

## 九、能力边界（不在本阶段范围）

- **语音答题**：仅支持文本输入，不支持语音
- **视频面试**：仅文字演练，不支持视频
- **完整公司题库**：仅基于 JD + 简历生成针对性题目，不提供完整公司题库
- **面试官 AI 对话**：仅单题作答，不支持多轮对话式面试
- **Markdown 答题**：仅纯文本，不支持代码高亮等 Markdown 格式
