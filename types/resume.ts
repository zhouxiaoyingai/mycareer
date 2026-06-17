/**
 * 简历相关类型定义
 */

/** 简历类型 */
export type ResumeType = "standard" | "tailored";

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
  | "failed";

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
  matchAnalysis?: import("./jd").MatchAnalysis;
  confirmableItems?: import("./jd").ConfirmableItem[];
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
