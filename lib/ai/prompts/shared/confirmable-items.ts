/**
 * 待确认项机制规则（Confirmable Items）
 * 定义 4 种待确认类型及提示词片段
 */

import type { ConfirmableItem } from "@/types/jd";

export const CONFIRMABLE_TYPES = [
  "inference",
  "placeholder",
  "quantification",
  "keyword_align",
] as const;

export const CONFIRMABLE_ITEMS_PROMPT_FRAGMENT = `
# 待确认项机制（Confirmable Items）

在生成定制简历时，对于任何 AI 推断、占位符、量化添加、关键词对齐的内容，必须生成待确认项，让用户逐项确认。

## 4 种待确认类型
1. inference: AI 推断（如将"参与了项目"升级为"主导了项目"）
2. placeholder: 占位符（如 \`____%\` 需用户填写具体数字）
3. quantification: 量化添加（原文无数值但 AI 添加了数字）
4. keyword_align: 关键词对齐（如"前端开发"→"Web 前端开发"）

## 输出格式
在 JSON 输出中新增 \`confirmableItems\` 数组：
\`\`\`json
{
  "confirmableItems": [
    {
      "field": "experiences[0].bullets[1]",
      "type": "inference",
      "originalText": "参与了项目开发",
      "inferredText": "主导了项目开发",
      "question": "原文是'参与了项目开发'，是否升级为'主导了项目开发'？",
      "options": ["接受推断", "保留原文", "自定义"]
    }
  ]
}
\`\`\`

## 规则
- 每条非 low 风险的改写必须生成对应的 confirmableItem
- placeholder 类型必须有明确的占位符位置
- question 必须清晰说明原文与推断的差异
- options 至少包含 "接受推断"、"保留原文"、"自定义" 三个选项
- 不可为 low 风险的格式修正生成待确认项
`.trim();

export function createConfirmableItem(input: {
  field: string;
  type: (typeof CONFIRMABLE_TYPES)[number];
  originalText: string;
  inferredText: string;
  question: string;
  options: string[];
}): ConfirmableItem {
  return {
    id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    field: input.field,
    type: input.type,
    originalText: input.originalText,
    inferredText: input.inferredText,
    question: input.question,
    options: input.options,
    status: "pending",
  };
}

export function filterPendingItems(items: ConfirmableItem[]): ConfirmableItem[] {
  return items.filter((item) => item.status === "pending");
}

export function isConfirmCompleted(items: ConfirmableItem[]): boolean {
  return items.every((item) => item.status !== "pending");
}
