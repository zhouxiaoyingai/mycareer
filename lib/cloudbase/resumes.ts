/**
 * 简历数据访问层
 */

import { Collections, insertOne, findOne, findMany, updateOne, deleteOne } from "./db";
import type {
  Resume,
  ResumeListItem,
  ResumeStructured,
  ProvenanceEntry,
  ResumeType,
  ResumeSourceType,
  ResumeStatus,
} from "@/types/resume";

export interface CreateResumeInput {
  userId: string;
  type: ResumeType;
  sourceType: ResumeSourceType;
  sourceFileId?: string;
  rawContent: string;
  structured: ResumeStructured;
  targetRole?: string;
  parentId?: string;
  status?: ResumeStatus;
}

export async function createResume(input: CreateResumeInput): Promise<Resume> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    type: input.type,
    sourceType: input.sourceType,
    sourceFileId: input.sourceFileId,
    rawContent: input.rawContent,
    structured: input.structured,
    targetRole: input.targetRole,
    parentId: input.parentId,
    provenance: [] as ProvenanceEntry[],
    aiFlavorScore: 0,
    status: input.status ?? ("draft" as ResumeStatus),
    createdAt: now,
    updatedAt: now,
  };

  const id = await insertOne(Collections.RESUMES, doc);
  return { _id: id, ...doc } as Resume;
}

export async function getResumeById(
  id: string,
  userId: string,
): Promise<Resume | null> {
  const resume = await findOne<Resume>(Collections.RESUMES, { _id: id });
  if (!resume || resume.userId !== userId) {
    return null;
  }
  return resume;
}

export async function listResumesByUser(
  userId: string,
  options?: {
    type?: ResumeType;
    status?: ResumeStatus;
    limit?: number;
  },
): Promise<ResumeListItem[]> {
  const query: Record<string, unknown> = { userId };
  if (options?.type) query.type = options.type;
  if (options?.status) query.status = options.status;

  const resumes = await findMany<Resume>(Collections.RESUMES, query, {
    orderBy: { field: "updatedAt", direction: "desc" },
    limit: options?.limit ?? 50,
  });

  return resumes.map((r) => ({
    _id: r._id,
    type: r.type,
    status: r.status,
    targetRole: r.targetRole,
    sourceType: r.sourceType,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export interface UpdateResumeInput {
  structured?: ResumeStructured;
  content?: { zh: string; en: string };
  provenance?: ProvenanceEntry[];
  aiFlavorScore?: number;
  status?: ResumeStatus;
  targetRole?: string;
  rawContent?: string;
}

export async function updateResume(
  id: string,
  userId: string,
  update: UpdateResumeInput,
): Promise<void> {
  const existing = await getResumeById(id, userId);
  if (!existing) {
    throw new Error("简历不存在或无权访问");
  }
  await updateOne(Collections.RESUMES, id, update as Record<string, unknown>);
}

export async function deleteResume(id: string, userId: string): Promise<void> {
  const existing = await getResumeById(id, userId);
  if (!existing) {
    throw new Error("简历不存在或无权访问");
  }
  await deleteOne(Collections.RESUMES, id);
}

export async function listTailoredByStandard(
  standardId: string,
  userId: string,
): Promise<ResumeListItem[]> {
  const resumes = await findMany<Resume>(
    Collections.RESUMES,
    { userId, parentId: standardId, type: "tailored" },
    { orderBy: { field: "updatedAt", direction: "desc" } },
  );
  return resumes.map((r) => ({
    _id: r._id,
    type: r.type,
    status: r.status,
    targetRole: r.targetRole,
    sourceType: r.sourceType,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}
