/**
 * 追溯规则（Provenance Rules）
 * 定义 11 种合法改写动作及 provenance 字段生成规则
 */

import type { HallucinationRisk, ProvenanceEntry } from "@/types/resume";

/** 11 种合法改写动作 */
export const REWRITE_ACTIONS = [
  "verb_upgrade",
  "quantification_add",
  "bullet_reorder",
  "keyword_align",
  "tense_fix",
  "redundancy_remove",
  "passive_to_active",
  "summary_condense",
  "format_unify",
  "skill_categorize",
  "typo_fix",
] as const;

export type RewriteAction = (typeof REWRITE_ACTIONS)[number];

/** 改写动作中英文描述映射 */
export const REWRITE_ACTION_LABELS: Record<RewriteAction, { zh: string; en: string }> = {
  verb_upgrade: { zh: "动词升级", en: "Verb upgrade" },
  quantification_add: { zh: "添加量化", en: "Quantification add" },
  bullet_reorder: { zh: "调整顺序", en: "Bullet reorder" },
  keyword_align: { zh: "关键词对齐", en: "Keyword align" },
  tense_fix: { zh: "时态修正", en: "Tense fix" },
  redundancy_remove: { zh: "去除冗余", en: "Redundancy remove" },
  passive_to_active: { zh: "被动转主动", en: "Passive to active" },
  summary_condense: { zh: "简介精简", en: "Summary condense" },
  format_unify: { zh: "格式统一", en: "Format unify" },
  skill_categorize: { zh: "技能分类", en: "Skill categorize" },
  typo_fix: { zh: "错别字修正", en: "Typo fix" },
};

/** 改写动作示例（用于提示词） */
export const REWRITE_ACTION_EXAMPLES: Record<RewriteAction, { from: string; to: string }> = {
  verb_upgrade: { from: "参与了项目开发", to: "协助完成项目开发" },
  quantification_add: { from: "提升了性能", to: "性能提升 30%" },
  bullet_reorder: { from: "[bullet A, bullet B, bullet C]", to: "[bullet B, bullet A, bullet C]" },
  keyword_align: { from: "前端开发", to: "Web 前端开发" },
  tense_fix: { from: "负责系统设计", to: "负责过系统设计" },
  redundancy_remove: { from: "负责负责模块开发", to: "负责模块开发" },
  passive_to_active: { from: "被分配主导项目", to: "主导项目" },
  summary_condense: { from: "5 年经验，擅长前端，熟悉 React", to: "5 年前端经验，精通 React" },
  format_unify: { from: "2021.1-2022.2", to: "2021-01 ~ 2022-02" },
  skill_categorize: { from: "React, Node, Figma, Photoshop", to: "技术: React, Node; 工具: Figma, Photoshop" },
  typo_fix: { from: "负责模快开发", to: "负责模块开发" },
};

/**
 * 生成 provenance 条目
 */
export function createProvenanceEntry(
  field: string,
  fromOriginal: string,
  rewriteAction: RewriteAction | string,
  hallucinationRisk: HallucinationRisk,
): ProvenanceEntry {
  return {
    field,
    fromOriginal,
    rewriteAction,
    hallucinationRisk,
  };
}

/**
 * 校验改写动作是否合法
 */
export function isValidRewriteAction(action: string): action is RewriteAction {
  return (REWRITE_ACTIONS as readonly string[]).includes(action);
}

/**
 * 批量生成 provenance 条目
 */
export function buildProvenanceEntries(
  items: Array<{
    field: string;
    fromOriginal: string;
    rewriteAction: RewriteAction | string;
    hallucinationRisk: HallucinationRisk;
  }>,
): ProvenanceEntry[] {
  return items.map((item) =>
    createProvenanceEntry(
      item.field,
      item.fromOriginal,
      item.rewriteAction,
      item.hallucinationRisk,
    ),
  );
}

/**
 * 筛选需要用户审核的条目（risk >= medium）
 */
export function filterReviewableEntries(
  entries: ProvenanceEntry[],
): ProvenanceEntry[] {
  return entries.filter((e) => e.hallucinationRisk !== "low");
}

/**
 * 生成 provenance 提示词片段
 */
export const PROVENANCE_PROMPT_FRAGMENT = `
# Provenance 追溯要求

每条输出的 bullet 必须附 provenance 字段，结构如下：
\`\`\`json
{
  "field": "experiences[0].bullets[0]",
  "fromOriginal": "原文片段（必须来自用户素材）",
  "rewriteAction": "合法动作名（见下表）",
  "hallucinationRisk": "low | medium | high"
}
\`\`\`

## 合法改写动作表（仅 11 种）
${REWRITE_ACTIONS.map(
  (action) =>
    `- ${action}: ${REWRITE_ACTION_LABELS[action].zh}（${REWRITE_ACTION_EXAMPLES[action].from} → ${REWRITE_ACTION_EXAMPLES[action].to}）`,
).join("\n")}

## 风险等级判定
- low: 直接引用或仅格式修正（format_unify/typo_fix/tense_fix/redundancy_remove）
- medium: 轻度改写（verb_upgrade/keyword_align/passive_to_active/summary_condense/skill_categorize/bullet_reorder）
- high: 推断或占位（quantification_add 原文无数值、含占位符、非合法动作）

## 禁止行为
- fromOriginal 字段不可为空，必须引用用户提供的原文
- rewriteAction 必须在 11 种合法动作内，否则视为编造
- hallucinationRisk 不可降级标记（high 不可标为 low）
`.trim();
