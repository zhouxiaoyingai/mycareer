/**
 * JD（职位描述）相关类型定义
 */

/** JD 状态 */
export type JdStatus = "draft" | "parsed" | "tailoring" | "completed" | "archived";

/** JD 技能项 */
export interface JdSkill {
  name: string;
  weight: number; // 1-5
  context?: string; // JD 中的上下文
}

/** JD 结构化数据 */
export interface JdStructured {
  title: string;
  company: string;
  location?: string;
  employmentType?: string; // 全职/兼职/实习
  experienceLevel?: string; // 初级/中级/高级/专家
  hardSkills: JdSkill[];
  softSkills: JdSkill[];
  industryTerms: JdSkill[];
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

/** 待确认项类型 */
export type ConfirmableItemType =
  | "inference"
  | "placeholder"
  | "quantification"
  | "keyword_align";

/** 待确认项状态 */
export type ConfirmableItemStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "modified";

/** 待确认项 */
export interface ConfirmableItem {
  id: string;
  field: string; // 如 "experiences[0].bullets[1]"
  type: ConfirmableItemType;
  originalText: string; // 原文片段
  inferredText: string; // AI 推断/改写后的文本
  question: string; // 向用户提出的问题
  options: string[]; // 可选项（如 ["接受推断", "保留原文", "自定义"]）
  status: ConfirmableItemStatus;
  userModifiedText?: string; // 用户自定义修改后的文本
}

/** 匹配度分析 */
export interface MatchAnalysis {
  matchScore: number; // 0-100
  matchDetails: Array<{
    skill: string;
    status: "matched" | "missing" | "partial";
    weight: number;
    evidence: string;
  }>;
  gapAnalysis: string;
}

/** JD 完整对象 */
export interface Jd {
  _id: string;
  userId: string;
  rawText: string;
  structured: JdStructured;
  targetRole?: string;
  status: JdStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** JD 列表项 */
export interface JdListItem {
  _id: string;
  status: JdStatus;
  targetRole?: string;
  structuredTitle: string;
  structuredCompany: string;
  createdAt: Date;
  updatedAt: Date;
}
