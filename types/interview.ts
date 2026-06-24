/**
 * 模拟面试相关类型定义
 * 字段命名与 Supabase PostgreSQL schema 对齐（snake_case）
 */

export type QuestionType = "technical" | "behavioral" | "case" | "general";

export const questionTypeLabels: Record<QuestionType, string> = {
  technical: "技术题",
  behavioral: "行为题",
  case: "案例题",
  general: "通用题",
};

export interface InterviewQuestion {
  id: string;
  type: QuestionType;
  question: string;
  referenceAnswer: string;
  answerStrategy: string;
}

export type InterviewStatus = "generated" | "archived";

export interface ResumeSnapshot {
  resumeId: string;
  targetRole?: string;
  contentZh: string;
}

export interface JdSnapshot {
  jdId: string;
  title: string;
  company?: string;
  hardSkills: Array<{ name: string; weight: number }>;
}

/** Interview 数据库对象 */
export interface Interview {
  id: string;
  user_id: string;
  resume_id: string;
  jd_id: string;
  resume_snapshot: ResumeSnapshot;
  jd_snapshot: JdSnapshot;
  question_types: QuestionType[];
  questions: InterviewQuestion[];
  status: InterviewStatus;
  created_at: string;
  updated_at: string;
}

export interface InterviewListItem {
  id: string;
  jd_id: string;
  jd_title: string;
  jd_company?: string;
  resume_id: string;
  question_count: number;
  question_types: QuestionType[];
  status: InterviewStatus;
  session_count: number;
  best_score?: number;
  created_at: string;
  updated_at: string;
}

export interface SessionAnswer {
  questionId: string;
  userAnswer: string;
  score: number;
  feedback: string;
  comparison: string;
  scoredAt: string;
}

export type SessionStatus = "in_progress" | "completed";

/** InterviewSession 数据库对象 */
export interface InterviewSession {
  id: string;
  user_id: string;
  interview_id: string;
  answers: SessionAnswer[];
  overall_score: number | null;
  overall_feedback: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface SessionListItem {
  id: string;
  status: SessionStatus;
  answered_count: number;
  total_questions: number;
  overall_score: number | null;
  created_at: string;
  updated_at: string;
}
