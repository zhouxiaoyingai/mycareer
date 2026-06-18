/**
 * 面试题集数据访问层
 */

import { Collections, insertOne, findOne, findMany, deleteOne } from "./db";
import type {
  Interview,
  InterviewListItem,
  InterviewQuestion,
  QuestionType,
  ResumeSnapshot,
  JdSnapshot,
  InterviewStatus,
} from "@/types/interview";

export interface CreateInterviewInput {
  userId: string;
  resumeId: string;
  jdId: string;
  resumeSnapshot: ResumeSnapshot;
  jdSnapshot: JdSnapshot;
  questionTypes: QuestionType[];
  questions: InterviewQuestion[];
  status?: InterviewStatus;
}

export async function createInterview(input: CreateInterviewInput): Promise<Interview> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    resumeId: input.resumeId,
    jdId: input.jdId,
    resumeSnapshot: input.resumeSnapshot,
    jdSnapshot: input.jdSnapshot,
    questionTypes: input.questionTypes,
    questions: input.questions,
    status: input.status ?? ("generated" as InterviewStatus),
    createdAt: now,
    updatedAt: now,
  };
  const id = await insertOne(Collections.INTERVIEWS, doc);
  return { _id: id, ...doc } as Interview;
}

export async function getInterviewById(id: string, userId: string): Promise<Interview | null> {
  const interview = await findOne<Interview>(Collections.INTERVIEWS, { _id: id });
  if (!interview || interview.userId !== userId) return null;
  return interview;
}

export async function listInterviewsByUser(
  userId: string,
  options?: { jdId?: string; limit?: number },
): Promise<InterviewListItem[]> {
  const query: Record<string, unknown> = { userId };
  if (options?.jdId) query.jdId = options.jdId;
  const interviews = await findMany<Interview>(Collections.INTERVIEWS, query, {
    orderBy: { field: "updatedAt", direction: "desc" },
    limit: options?.limit ?? 50,
  });
  return interviews.map((i) => ({
    _id: i._id,
    jdId: i.jdId,
    jdTitle: i.jdSnapshot.title,
    jdCompany: i.jdSnapshot.company,
    resumeId: i.resumeId,
    questionCount: i.questions.length,
    questionTypes: i.questionTypes,
    status: i.status,
    sessionCount: 0,
    bestScore: undefined,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));
}

export async function deleteInterview(id: string, userId: string): Promise<void> {
  const existing = await getInterviewById(id, userId);
  if (!existing) throw new Error("面试题集不存在或无权访问");
  await deleteOne(Collections.INTERVIEWS, id);
}
