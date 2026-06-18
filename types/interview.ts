/**
 * 模拟面试相关类型定义
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

export interface Interview {
  _id: string;
  userId: string;
  resumeId: string;
  jdId: string;
  resumeSnapshot: ResumeSnapshot;
  jdSnapshot: JdSnapshot;
  questionTypes: QuestionType[];
  questions: InterviewQuestion[];
  status: InterviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewListItem {
  _id: string;
  jdId: string;
  jdTitle: string;
  jdCompany?: string;
  resumeId: string;
  questionCount: number;
  questionTypes: QuestionType[];
  status: InterviewStatus;
  sessionCount: number;
  bestScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionAnswer {
  questionId: string;
  userAnswer: string;
  score: number;
  feedback: string;
  comparison: string;
  scoredAt: Date;
}

export type SessionStatus = "in_progress" | "completed";

export interface InterviewSession {
  _id: string;
  userId: string;
  interviewId: string;
  answers: SessionAnswer[];
  overallScore?: number;
  overallFeedback?: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionListItem {
  _id: string;
  status: SessionStatus;
  answeredCount: number;
  totalQuestions: number;
  overallScore?: number;
  createdAt: Date;
  updatedAt: Date;
}
