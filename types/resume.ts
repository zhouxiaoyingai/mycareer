/**
 * 简历相关类型定义
 * 字段命名与 Supabase PostgreSQL schema 对齐（snake_case）
 */
import type { MatchAnalysis, ConfirmableItem } from "./jd";

/** 简历类型 */
export type ResumeType = "master" | "standard" | "tailored";

/** 简历来源类型 */
export type ResumeSourceType =
  | "upload_pdf"
  | "upload_word"
  | "paste"
  | "form"
  | "ai_chat";

/** 简历状态 */
export type ResumeStatus =
  | "draft"
  | "parsed"
  | "generating"
  | "completed"
  | "failed"
  | "confirmed"
  | "archived";

/** 简历数据库对象 */
export interface Resume {
  id: string;
  user_id: string;
  type: ResumeType;
  source_type: ResumeSourceType;
  source_file_id: string | null;
  raw_content: string;
  structured: ResumeStructured;
  target_role: string | null;
  parent_id: string | null;
  provenance: ProvenanceEntry[];
  ai_flavor_score: number | null;
  status: ResumeStatus;
  greeting: Greeting | null;
  jd_id: string | null;
  match_analysis: MatchAnalysis | null;
  confirmable_items: ConfirmableItem[] | null;
  confirm_completed: boolean;
  created_at: string;
  updated_at: string;
}

/** 简历列表项 */
export interface ResumeListItem {
  id: string;
  type: ResumeType;
  status: ResumeStatus;
  target_role: string | null;
  source_type: ResumeSourceType;
  created_at: string;
  updated_at: string;
}

/** 幻觉风险等级 */
export type HallucinationRisk = "low" | "medium" | "high";

/** 溯源条目 */
export interface ProvenanceEntry {
  field: string;
  fromOriginal: string;
  rewriteAction: string;
  hallucinationRisk: HallucinationRisk;
}

/** 联系信息 */
export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  [key: string]: string | undefined;
}

/** 工作经历 */
export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  bullets: string[];
}

/** 项目经历 */
export interface Project {
  id: string;
  name: string;
  role?: string;
  description?: string;
  bullets: string[];
  link?: string;
}

/** 教育经历 */
export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

/** 技能集合 */
export interface SkillSet {
  technical: string[];
  languages: string[];
  tools: string[];
  certifications: string[];
}

/** 结构化简历数据 */
export interface ResumeStructured {
  contact: ContactInfo;
  summary?: string;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: SkillSet;
}

/** 打招呼短文（嵌入定制简历） */
export interface Greeting {
  text: string;
  generatedAt: string;
  version: number;
}

/** 解析简历结果 */
export interface ParsedResumeResult {
  structured: ResumeStructured;
  provenance: ProvenanceEntry[];
}

/** 简历生成选项 (提示词输入) */
export interface GenerateStandardOptions {
  templateStyle: "star" | "project" | "skill" | "mixed";
  length: "1page" | "2page" | "auto";
  language: "zh" | "en" | "both";
}

/** 简历内容 (中英双版本) — 提示词层使用 */
export interface ResumeContent {
  zh: string;
  en: string;
}

/** 标准版简历视图 (前端列表/选择器) */
export type StandardResume = Pick<
  Resume,
  | "id"
  | "user_id"
  | "type"
  | "raw_content"
  | "structured"
  | "target_role"
  | "status"
  | "created_at"
  | "updated_at"
>;
