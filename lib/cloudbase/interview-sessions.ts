/**
 * 答题会话数据访问层
 */

import { Collections, insertOne, findOne, findMany, updateOne } from "./db";
import type {
  InterviewSession,
  SessionListItem,
  SessionAnswer,
  SessionStatus,
} from "@/types/interview";

export interface CreateSessionInput {
  userId: string;
  interviewId: string;
  status?: SessionStatus;
}

export async function createSession(input: CreateSessionInput): Promise<InterviewSession> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    interviewId: input.interviewId,
    answers: [] as SessionAnswer[],
    status: input.status ?? ("in_progress" as SessionStatus),
    createdAt: now,
    updatedAt: now,
  };
  const id = await insertOne(Collections.INTERVIEW_SESSIONS, doc);
  return { _id: id, ...doc } as InterviewSession;
}

export async function getSessionById(id: string, userId: string): Promise<InterviewSession | null> {
  const session = await findOne<InterviewSession>(Collections.INTERVIEW_SESSIONS, { _id: id });
  if (!session || session.userId !== userId) return null;
  return session;
}

export async function listSessionsByInterview(
  interviewId: string,
  userId: string,
): Promise<SessionListItem[]> {
  const sessions = await findMany<InterviewSession>(
    Collections.INTERVIEW_SESSIONS,
    { userId, interviewId },
    { orderBy: { field: "createdAt", direction: "desc" } },
  );
  return sessions.map((s) => ({
    _id: s._id,
    status: s.status,
    answeredCount: s.answers.length,
    totalQuestions: 0,
    overallScore: s.overallScore,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export interface UpdateSessionInput {
  answers?: SessionAnswer[];
  overallScore?: number;
  overallFeedback?: string;
  status?: SessionStatus;
}

export async function updateSession(
  id: string,
  userId: string,
  update: UpdateSessionInput,
): Promise<void> {
  const existing = await getSessionById(id, userId);
  if (!existing) throw new Error("答题会话不存在或无权访问");
  await updateOne(Collections.INTERVIEW_SESSIONS, id, update as Record<string, unknown>);
}

/**
 * 批量查询多个题集的会话统计
 */
export async function getSessionStatsByInterviewIds(
  interviewIds: string[],
  userId: string,
): Promise<Map<string, { sessionCount: number; bestScore?: number }>> {
  const result = new Map<string, { sessionCount: number; bestScore?: number }>();
  if (interviewIds.length === 0) return result;

  const sessions = await findMany<InterviewSession>(
    Collections.INTERVIEW_SESSIONS,
    { userId, interviewId: { $in: interviewIds } },
    { limit: 500 },
  );

  for (const s of sessions) {
    const existing = result.get(s.interviewId) ?? { sessionCount: 0 };
    existing.sessionCount += 1;
    if (s.overallScore !== undefined) {
      if (existing.bestScore === undefined || s.overallScore > existing.bestScore) {
        existing.bestScore = s.overallScore;
      }
    }
    result.set(s.interviewId, existing);
  }
  return result;
}
