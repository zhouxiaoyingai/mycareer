/**
 * 简历相关类型定义
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

/** 简历内容（中英双版） */
export interface ResumeContent {
  zh: string;
  en: string;
}

/** 打招呼短文（嵌入定制简历） */
export interface Greeting {
  text: string;           // 打招呼短文（50-100字）
  generatedAt: Date;      // 生成时间
  version: number;        // 版本号，重新生成时 +1
}

/** 生成标准简历的选项 */
export interface GenerateStandardOptions {
  templateStyle: "star" | "project" | "skill" | "mixed";
  length: "1page" | "2page" | "auto";
  language: "zh" | "en" | "both";
}

/** 简历完整对象（数据库存储） */
export interface Resume {
  _id: string;
  userId: string;
  type: ResumeType;
  sourceType: ResumeSourceType;
  sourceFileId?: string;
  rawContent: string;
  structured: ResumeStructured;
  content?: ResumeContent;
  targetRole?: string;
  parentId?: string;
  provenance: ProvenanceEntry[];
  aiFlavorScore: number;
  status: ResumeStatus;
  // 阶段3新增：JD 关联与待确认项
  jdId?: string;
  matchAnalysis?: MatchAnalysis;
  confirmableItems?: ConfirmableItem[];
  confirmCompleted?: boolean;
  // 阶段4新增：打招呼短文（仅 tailored 类型简历）
  greeting?: Greeting;
  createdAt: Date;
  updatedAt: Date;
}

/** 简历列表项 */
export interface ResumeListItem {
  _id: string;
  type: ResumeType;
  status: ResumeStatus;
  targetRole?: string;
  sourceType: ResumeSourceType;
  createdAt: Date;
  updatedAt: Date;
}

/** 解析简历结果 */
export interface ParsedResumeResult {
  structured: ResumeStructured;
  provenance: ProvenanceEntry[];
}
