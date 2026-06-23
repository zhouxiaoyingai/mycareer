/**
 * 优势识别相关类型定义
 */

/** 优势识别报告状态 */
export type StrengthStatus = "in_progress" | "completed";

/** 问卷原始答案 */
export interface StrengthAnswers {
  currentStage: string;
  careerClarity?: string;
  flowExperiences: string[];
  achievementType: string;
  achievementStory?: string;
  workEnvironmentPreferences: {
    remoteWork: number;
    stability: number;
    fastPaced: number;
    teamwork: number;
    independence: number;
    creativity: number;
  };
  valueRanking: string[];
  riskTolerance: string;
  learningStyle?: string[];
  yearsOfExperience: number;
}

/** 可迁移技能条目 */
export interface TransferableSkill {
  skill: string;
  transferTo: string;
  evidence: string;
}

/** 职业路径条目 */
export interface CareerPath {
  careerName: string;
  industry: string;
  skillMatch: string;
  entryPath: string;
  salaryRange: string;
  searchStrategy: string;
  transitionTime: string;
}

/** 快速起步条目 */
export interface QuickWin {
  step: string;
  resource: string;
  purpose: string;
}

/** 现实检验 */
export interface RealityCheck {
  bestFit: string;
  timelines: Array<{ path: string; phase: string; duration: string }>;
}

/** AI 报告内容 */
export interface StrengthReportContent {
  transferableSkills: TransferableSkill[];
  careerPaths: CareerPath[];
  quickWins: QuickWin[];
  realityCheck: RealityCheck;
  generatedAt: Date;
}

/** 优势识别报告（数据库对象） */
export interface StrengthReport {
  _id: string;
  userId: string;
  status: StrengthStatus;
  createdAt: Date;
  updatedAt: Date;
  answers: StrengthAnswers;
  report?: StrengthReportContent;
}
