export const AI_FLAVOR_BLACKLIST_ZH: string[] = [
  "赋能", "打造", "夯实", "抓手", "闭环", "心智", "颗粒度", "组合拳",
  "链路", "对齐", "拉通", "下沉", "复用", "沉淀", "反哺", "触达",
  "迭代", "敏捷", "矩阵", "漏斗", "赛道", "痛点", "痒点", "爽点",
];

export const AI_FLAVOR_BLACKLIST_EN: string[] = [
  "spearheaded", "orchestrated", "leveraged", "utilized", "synergy",
  "streamlined", "pioneered", "revolutionized", "transformed", "optimized",
  "maximized", "minimized", "enhanced", "facilitated", "implemented",
  "established", "formulated", "spearhead", "orchestrate", "leverage",
  "utilize", "streamline", "pioneer", "revolutionize", "transform",
  "optimize", "maximize", "minimize", "enhance", "facilitate",
  "implement", "establish", "formulate", "delve", "navigate", "underscore",
  "paramount", "seamless", "robust", "cutting-edge", "state-of-the-art",
  "game-changer", "holistic", "paradigm", "synergize", "empower",
  "enable", "foster", "drive", "champion", "catalyst", "cornerstone",
];

export const AI_FLAVOR_THRESHOLD = 6;

export interface AiFlavorHitResult {
  total: number;
  matchedWords: string[];
  zhHits: number;
  enHits: number;
}

export function countAiFlavorHits(text: string): AiFlavorHitResult {
  const lowerText = text.toLowerCase();
  const matchedWords: string[] = [];
  let zhHits = 0;
  let enHits = 0;

  for (const word of AI_FLAVOR_BLACKLIST_ZH) {
    const regex = new RegExp(word, "g");
    const matches = text.match(regex);
    if (matches) {
      zhHits += matches.length;
      matchedWords.push(...matches);
    }
  }

  for (const word of AI_FLAVOR_BLACKLIST_EN) {
    const regex = new RegExp(`\\b${word}\\b`, "g");
    const matches = lowerText.match(regex);
    if (matches) {
      enHits += matches.length;
      matchedWords.push(...matches);
    }
  }

  return {
    total: zhHits + enHits,
    matchedWords,
    zhHits,
    enHits,
  };
}

export interface AiFlavorDetectionResult {
  passed: boolean;
  hits: AiFlavorHitResult;
  threshold: number;
}

export function detectAiFlavor(text: string): AiFlavorDetectionResult {
  const hits = countAiFlavorHits(text);
  return {
    passed: hits.total < AI_FLAVOR_THRESHOLD,
    hits,
    threshold: AI_FLAVOR_THRESHOLD,
  };
}
