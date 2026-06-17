import {
  ANTI_HALLUCINATION_RULES,
  injectAntiHallucinationRules,
  validateRewriteAction,
  assessHallucinationRisk,
  DEFAULT_ANTI_HALLUCINATION_CONTEXT,
} from "../anti-hallucination";
import { detectAiFlavor, countAiFlavorHits, AI_FLAVOR_THRESHOLD } from "../ai-flavor-check";
import {
  REWRITE_ACTIONS,
  REWRITE_ACTION_LABELS,
  isValidRewriteAction,
  createProvenanceEntry,
  filterReviewableEntries,
  PROVENANCE_PROMPT_FRAGMENT,
} from "../provenance-rules";

describe("ANTI_HALLUCINATION_RULES", () => {
  it("应包含三维度规则", () => {
    expect(ANTI_HALLUCINATION_RULES).toContain("维度 1：不编造事实");
    expect(ANTI_HALLUCINATION_RULES).toContain("维度 2：合法改写");
    expect(ANTI_HALLUCINATION_RULES).toContain("维度 3：防 AI 味");
  });

  it("应列出 11 种合法改写动作", () => {
    const actions = [
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
    for (const action of actions) {
      expect(ANTI_HALLUCINATION_RULES).toContain(action);
    }
  });

  it("应包含占位符规则", () => {
    expect(ANTI_HALLUCINATION_RULES).toContain("____%");
    expect(ANTI_HALLUCINATION_RULES).toContain("[电话待填写]");
  });
});

describe("injectAntiHallucinationRules", () => {
  it("应将规则追加到原始提示词后", () => {
    const original = "你是一个简历助手。";
    const result = injectAntiHallucinationRules(original);
    expect(result).toContain("你是一个简历助手。");
    expect(result).toContain("防幻觉三维度规则");
  });

  it("应支持自定义上下文", () => {
    const original = "系统提示词";
    const result = injectAntiHallucinationRules(original, {
      placeholderMode: false,
      requireProvenance: false,
      aiFlavorThreshold: 3,
    });
    expect(result).toContain("未启用占位符模式");
    expect(result).toContain("AI 味检测阈值：命中 ≥3 次");
  });

  it("默认上下文应强制 provenance", () => {
    const result = injectAntiHallucinationRules("test");
    expect(result).toContain("强制要求：每条输出 bullet 必须附 provenance");
  });
});

describe("validateRewriteAction", () => {
  it("应接受 11 种合法动作", () => {
    expect(validateRewriteAction("verb_upgrade")).toBe(true);
    expect(validateRewriteAction("typo_fix")).toBe(true);
    expect(validateRewriteAction("skill_categorize")).toBe(true);
  });

  it("应拒绝非法动作", () => {
    expect(validateRewriteAction("fabricate_data")).toBe(false);
    expect(validateRewriteAction("invent_project")).toBe(false);
    expect(validateRewriteAction("")).toBe(false);
  });
});

describe("assessHallucinationRisk", () => {
  it("非法动作应返回 high", () => {
    expect(assessHallucinationRisk("fabricate", "原文", "改写")).toBe("high");
  });

  it("含占位符应返回 high", () => {
    expect(
      assessHallucinationRisk("verb_upgrade", "原文", "提升了 ____%"),
    ).toBe("high");
    expect(
      assessHallucinationRisk("format_unify", "原文", "[待填写]"),
    ).toBe("high");
  });

  it("quantification_add 原文无数值应返回 high", () => {
    expect(
      assessHallucinationRisk("quantification_add", "提升了性能", "性能提升 30%"),
    ).toBe("high");
  });

  it("quantification_add 原文有数值应返回 medium", () => {
    expect(
      assessHallucinationRisk("quantification_add", "提升 30%", "性能提升 30%"),
    ).toBe("medium");
  });

  it("keyword_align 应返回 medium", () => {
    expect(
      assessHallucinationRisk("keyword_align", "前端开发", "Web 前端开发"),
    ).toBe("medium");
  });

  it("format_unify 应返回 low", () => {
    expect(
      assessHallucinationRisk("format_unify", "2021.1", "2021-01"),
    ).toBe("low");
  });

  it("typo_fix 应返回 low", () => {
    expect(
      assessHallucinationRisk("typo_fix", "模快开发", "模块开发"),
    ).toBe("low");
  });
});

describe("AI 味检测", () => {
  it("应检测中文 AI 味词", () => {
    const text = "通过赋能团队，打造闭环生态，夯实基础设施";
    const result = countAiFlavorHits(text);
    expect(result.zhHits).toBe(4);
    expect(result.total).toBe(4);
    expect(result.matchedWords).toContain("赋能");
    expect(result.matchedWords).toContain("打造");
    expect(result.matchedWords).toContain("闭环");
    expect(result.matchedWords).toContain("夯实");
  });

  it("应检测英文 AI 味词（大小写不敏感）", () => {
    const text = "Spearheaded the project and leveraged synergy across teams.";
    const result = countAiFlavorHits(text);
    expect(result.enHits).toBe(3);
    expect(result.matchedWords).toContain("spearheaded");
    expect(result.matchedWords).toContain("leveraged");
    expect(result.matchedWords).toContain("synergy");
  });

  it("命中数低于阈值应通过检测", () => {
    const text = "负责模块开发，参与代码评审";
    const result = detectAiFlavor(text);
    expect(result.passed).toBe(true);
    expect(result.threshold).toBe(AI_FLAVOR_THRESHOLD);
  });

  it("命中数达到阈值应不通过检测", () => {
    const text = [
      "赋能",
      "打造",
      "夯实",
      "抓手",
      "闭环",
      "心智",
    ].join("、");
    const result = detectAiFlavor(text);
    expect(result.passed).toBe(false);
    expect(result.hits.total).toBeGreaterThanOrEqual(AI_FLAVOR_THRESHOLD);
  });

  it("无 AI 味词应通过检测", () => {
    const text = "负责用户模块开发，使用 React 和 TypeScript";
    const result = detectAiFlavor(text);
    expect(result.passed).toBe(true);
    expect(result.hits.total).toBe(0);
  });
});

describe("provenance-rules", () => {
  it("应定义 11 种合法改写动作", () => {
    expect(REWRITE_ACTIONS).toHaveLength(11);
  });

  it("每种动作应有中英文标签", () => {
    for (const action of REWRITE_ACTIONS) {
      expect(REWRITE_ACTION_LABELS[action].zh).toBeTruthy();
      expect(REWRITE_ACTION_LABELS[action].en).toBeTruthy();
    }
  });

  it("isValidRewriteAction 应正确判定", () => {
    expect(isValidRewriteAction("verb_upgrade")).toBe(true);
    expect(isValidRewriteAction("invalid_action")).toBe(false);
  });

  it("createProvenanceEntry 应生成正确结构", () => {
    const entry = createProvenanceEntry(
      "experiences[0].bullets[0]",
      "原文片段",
      "verb_upgrade",
      "medium",
    );
    expect(entry.field).toBe("experiences[0].bullets[0]");
    expect(entry.fromOriginal).toBe("原文片段");
    expect(entry.rewriteAction).toBe("verb_upgrade");
    expect(entry.hallucinationRisk).toBe("medium");
  });

  it("filterReviewableEntries 应过滤 low 风险", () => {
    const entries = [
      createProvenanceEntry("a", "原文1", "format_unify", "low"),
      createProvenanceEntry("b", "原文2", "verb_upgrade", "medium"),
      createProvenanceEntry("c", "原文3", "quantification_add", "high"),
    ];
    const reviewable = filterReviewableEntries(entries);
    expect(reviewable).toHaveLength(2);
    expect(reviewable[0].field).toBe("b");
    expect(reviewable[1].field).toBe("c");
  });

  it("PROVENANCE_PROMPT_FRAGMENT 应包含动作表", () => {
    expect(PROVENANCE_PROMPT_FRAGMENT).toContain("verb_upgrade");
    expect(PROVENANCE_PROMPT_FRAGMENT).toContain("typo_fix");
    expect(PROVENANCE_PROMPT_FRAGMENT).toContain("风险等级判定");
  });
});
