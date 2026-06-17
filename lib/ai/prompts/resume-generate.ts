/**
 * 简历标准版生成提示词
 * 基于 master 简历生成 STAR 原则整理的中英双版标准简历
 */

import { injectAntiHallucinationRules } from "./shared/anti-hallucination";
import { PROVENANCE_PROMPT_FRAGMENT } from "./shared/provenance-rules";
import type { GenerateStandardOptions, ResumeStructured } from "@/types/resume";

export interface ResumeGenerateInput {
  structured: ResumeStructured;
  options: GenerateStandardOptions;
  targetRole?: string;
}

export const RESUME_GENERATE_SYSTEM_PROMPT = injectAntiHallucinationRules(
  `你是一个专业的简历撰写助手。任务是基于用户提供的结构化简历数据，生成 STAR 原则整理的中英双版标准简历。

# 生成原则

## STAR 原则
每条 bullet 应尽量符合 STAR 框架：
- Situation（情境）：项目/任务背景
- Task（任务）：你的职责
- Action（行动）：你采取的具体行动
- Result（结果）：可量化的成果

但并非每条 bullet 都必须包含全部四要素，优先保证 Result 可量化。

## 中英双版独立重写（非翻译）
- 中文版：基于中文素材直接撰写，符合中文简历习惯
- 英文版：基于英文素材或从中文重写（非逐句翻译），符合英文简历习惯
- 两版内容核心信息一致，但表述方式独立优化
- 原文为纯中文时，英文版基于中文重写；原文为纯英文时同理

## 量化数据规则
- 原文已有数字 → 保留并可优化表述
- 原文无数字 → 生成占位符 \`____%\` 提示用户填写
- 绝对禁止编造具体数字、百分比、金额

## 模板风格
- star: STAR 原则强化版，每条 bullet 突出 Result
- project: 项目导向，项目经历前置，工作经历精简
- skill: 技能导向，技能矩阵突出，经历按技能分组
- mixed: 混合风格，根据素材自动选择最佳呈现方式

## 长度控制
- 1page: 精简至 1 页（约 600-800 字中文 / 400-600 词英文）
- 2page: 扩展至 2 页（约 1200-1600 字中文 / 800-1200 词英文）
- auto: 根据素材自动决定（默认）

## 输出格式（严格 JSON）
\`\`\`json
{
  "content": {
    "zh": "中文版 Markdown 简历",
    "en": "英文版 Markdown 简历"
  },
  "provenance": [
    {
      "field": "experiences[0].bullets[0]",
      "fromOriginal": "原文片段",
      "rewriteAction": "verb_upgrade",
      "hallucinationRisk": "medium"
    }
  ],
  "aiFlavorScore": 0
}
\`\`\`

## Markdown 格式要求
- 使用 \`##\` 作为各模块标题（如 \`## 工作经历\`、\`## 项目经历\`）
- bullet 点使用 \`-\` 符号
- 联系信息使用 \`|\` 分隔（如 \`张三 | zhangsan@email.com | 138-0000-0000\`）
- 时间格式统一为 \`YYYY.MM - YYYY.MM\` 或 \`YYYY.MM - 至今\`
- 占位符 \`____%\` 和 \`[待填写]\` 需保留，便于后续高亮提示

${PROVENANCE_PROMPT_FRAGMENT}

## 禁止行为
- 编造项目、公司、技术栈
- 使用 AI 味词（赋能/打造/闭环/spearheaded/synergy 等，详见防幻觉规则）
- 将中文版直接逐句翻译为英文版
- 合并非同一经历的 bullet
- 删除原文中明确存在的经历（即使时间久远）`,
);

/**
 * 构建简历生成的用户消息
 */
export function buildResumeGenerateUserMessage(input: ResumeGenerateInput): string {
  const { structured, options, targetRole } = input;

  const styleLabel = {
    star: "STAR 原则强化",
    project: "项目导向",
    skill: "技能导向",
    mixed: "混合风格",
  }[options.templateStyle];

  const lengthLabel = {
    "1page": "1 页",
    "2page": "2 页",
    auto: "自动",
  }[options.length];

  const languageLabel = {
    zh: "仅中文",
    en: "仅英文",
    both: "中英双版",
  }[options.language];

  const targetRoleLine = targetRole
    ? `\n目标岗位：${targetRole}（用于关键词对齐，但不可编造相关经历）`
    : "";

  return `请基于以下结构化简历数据，生成标准版简历。

# 生成选项
- 模板风格：${styleLabel}
- 长度：${lengthLabel}
- 语言：${languageLabel}${targetRoleLine}

# 结构化简历数据

\`\`\`json
${JSON.stringify(structured, null, 2)}
\`\`\`

请严格按照系统提示词中的 JSON 格式输出，content.zh 和 content.en 为 Markdown 格式简历文本。`;
}

/**
 * 获取简历生成的完整消息列表
 */
export function buildResumeGenerateMessages(input: ResumeGenerateInput) {
  return [
    { role: "system" as const, content: RESUME_GENERATE_SYSTEM_PROMPT },
    { role: "user" as const, content: buildResumeGenerateUserMessage(input) },
  ];
}

/**
 * 解析 AI 返回的简历生成结果
 */
export interface ResumeGenerateResult {
  content: { zh: string; en: string };
  provenance: Array<{
    field: string;
    fromOriginal: string;
    rewriteAction: string;
    hallucinationRisk: "low" | "medium" | "high";
  }>;
  aiFlavorScore: number;
}

export function parseResumeGenerateResult(raw: string): ResumeGenerateResult {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      content: {
        zh: parsed.content?.zh ?? "",
        en: parsed.content?.en ?? "",
      },
      provenance: Array.isArray(parsed.provenance) ? parsed.provenance : [],
      aiFlavorScore: typeof parsed.aiFlavorScore === "number" ? parsed.aiFlavorScore : 0,
    };
  } catch (err) {
    throw new Error(`简历生成结果解析失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}
