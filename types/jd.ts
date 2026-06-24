/**
 * JD（职位描述）相关类型定义
 * 字段命名与 Supabase PostgreSQL schema 对齐（snake_case）
 */

/** JD 状态 */
export type JdStatus = "draft" | "parsed" | "tailoring" | "completed" | "archived";

/** JD 技能项 */
export interface JdSkill {
  name: string;
  weight: number;
  context?: string;
}

/** JD 结构化数据 */
export interface JdStructured {
  title: string;
  company?: string;
  location?: string;
  employmentType?: string;
  experienceLevel?: string;
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
  field: string;
  type: ConfirmableItemType;
  originalText: string;
  inferredText: string;
  question: string;
  options: string[];
  status: ConfirmableItemStatus;
  userModifiedText?: string;
}

/** 匹配度分析 */
export interface MatchAnalysis {
  matchScore: number;
  matchDetails: Array<{
    skill: string;
    status: "matched" | "missing" | "partial";
    weight: number;
    evidence: string;
  }>;
  gapAnalysis: string;
}

/** JD 数据库对象 */
export interface Jd {
  id: string;
  user_id: string;
  raw_text: string;
  structured: JdStructured;
  target_role: string | null;
  status: JdStatus;
  created_at: string;
  updated_at: string;
}

/** JD 列表项 */
export interface JdListItem {
  id: string;
  title: string;
  company?: string;
  status: JdStatus;
  target_role: string | null;
  created_at: string;
  updated_at: string;
}
