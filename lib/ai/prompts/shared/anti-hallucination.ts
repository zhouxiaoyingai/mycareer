/**
 * 防幻觉三维度规则
 * 维度1：不编造事实
 * 维度2：合法改写（仅 11 种动作）
 * 维度3：防 AI 味（由 ai-flavor-check.ts 实现）
 */

export const ANTI_HALLUCINATION_RULES = `
# 防幻觉三维度规则（严格遵守）

## 维度 1：不编造事实
- 数字、百分比、金额、时长等量化数据一律不可凭空补全
- 原文无量化数据时，生成占位符 \`____%\`（数字位置）或 \`[待填写]\`（文本位置）
- 联系信息未提供时使用占位符：\`[电话待填写]\` \`[邮箱待填写]\` 等
- 项目名称、技术栈、公司名不可推断，缺失则标注 \`[缺失]\`
- 任何基于上下文的推断必须标记 \`hallucinationRisk: "high"\` 并强制用户审核
- 日期不可推算，缺失则留空或使用 \`YYYY-MM\` 占位

## 维度 2：合法改写（仅允许以下 11 种动作）
1. verb_upgrade: 动词升级（参与→协助，做→完成）
2. quantification_add: 添加量化（仅当原文已含数字，不可新增数字）
3. bullet_reorder: 调整 bullet 顺序（按 JD 优先级或重要性）
4. keyword_align: 关键词对齐 JD（替换同义词，不改语义）
5. tense_fix: 时态修正（统一为过去式或现在进行式）
6. redundancy_remove: 去除冗余词（"负责负责" → "负责"）
7. passive_to_active: 被动转主动（"被分配" → "承担"）
8. summary_condense: 个人简介精简（保留核心信息）
9. format_unify: 格式统一（日期、标点、大小写）
10. skill_categorize: 技能分类整理（按技术/语言/工具归类）
11. typo_fix: 错别字修正（仅明显错别字，不改专有名词）

其他改写动作一律视为违规，必须保留原文。
每条改写必须在 provenance 中记录 fromOriginal + rewriteAction。

## 维度 3：防 AI 味
- 中文禁用词：赋能/打造/夯实/抓手/闭环/心智/颗粒度/组合拳/链路/对齐/拉通/下沉/复用/沉淀/反哺/触达/迭代/敏捷/矩阵/漏斗/赛道/痛点/痒点/爽点
- 英文禁用词：spearheaded/orchestrated/leveraged/utilized/synergy/streamlined/pioneered/revolutionized/transformed/optimized 等 53 词
- 单份简历 AI 味命中 ≥6 次必须强制修改
- aiFlavorScore 记录在简历记录中，供用户审核

## 输出要求
- 每条 bullet 必须附 provenance 追溯信息
- hallucinationRisk 分级：low（直接引用）/ medium（轻度改写）/ high（推断或占位）
- medium 及以上风险项需在审核环节逐项展示
- 占位符在最终输出中高亮列出，提示用户填写
`.trim();

export interface AntiHallucinationContext {
  /** 是否启用占位符模式（缺失数据用占位符而非编造） */
  placeholderMode: boolean;
  /** 是否强制 provenance 追溯 */
  requireProvenance: boolean;
  /** AI 味检测阈值 */
  aiFlavorThreshold: number;
}

export const DEFAULT_ANTI_HALLUCINATION_CONTEXT: AntiHallucinationContext = {
  placeholderMode: true,
  requireProvenance: true,
  aiFlavorThreshold: 6,
};

/**
 * 将防幻觉规则注入系统提示词
 * @param systemPrompt 原始系统提示词
 * @param context 防幻觉上下文配置
 * @returns 注入规则后的系统提示词
 */
export function injectAntiHallucinationRules(
  systemPrompt: string,
  context: AntiHallucinationContext = DEFAULT_ANTI_HALLUCINATION_CONTEXT,
): string {
  const rules = buildContextualRules(context);
  return `${systemPrompt}\n\n${rules}`;
}

function buildContextualRules(context: AntiHallucinationContext): string {
  const sections: string[] = [ANTI_HALLUCINATION_RULES];

  if (!context.placeholderMode) {
    sections.push(
      "\n注意：当前未启用占位符模式，但仍禁止编造具体数字，缺失数据应省略或标注。",
    );
  }

  if (context.requireProvenance) {
    sections.push(
      "\n强制要求：每条输出 bullet 必须附 provenance 字段，包含 fromOriginal、rewriteAction、hallucinationRisk 三项。",
    );
  }

  sections.push(`\nAI 味检测阈值：命中 ≥${context.aiFlavorThreshold} 次必须强制修改。`);

  return sections.join("\n");
}

/**
 * 校验改写动作是否在 11 种合法动作内
 */
export function validateRewriteAction(action: string): boolean {
  const validActions = [
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
  ];
  return validActions.includes(action);
}

/**
 * 根据改写动作评估幻觉风险等级
 */
export function assessHallucinationRisk(
  action: string,
  fromOriginal: string,
  rewritten: string,
): "low" | "medium" | "high" {
  if (!validateRewriteAction(action)) {
    return "high";
  }

  // 含占位符的条目风险高
  if (rewritten.includes("____") || rewritten.includes("[待填写") || rewritten.includes("[缺失]")) {
    return "high";
  }

  // 量化添加需检查原文是否已有数字
  if (action === "quantification_add") {
    const hasNumber = /\d+/.test(fromOriginal);
    if (!hasNumber) {
      return "high";
    }
  }

  // 关键词对齐和动词升级为中等风险
  if (action === "keyword_align" || action === "verb_upgrade") {
    return "medium";
  }

  // 格式统一、错别字修正、时态修正为低风险
  if (["format_unify", "typo_fix", "tense_fix", "redundancy_remove"].includes(action)) {
    return "low";
  }

  return "medium";
}
