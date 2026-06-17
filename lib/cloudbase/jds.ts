/**
 * JD 数据访问层
 */

import { Collections, insertOne, findOne, findMany, updateOne, deleteOne } from "./db";
import type { Jd, JdListItem, JdStructured, JdStatus } from "@/types/jd";

export interface CreateJdInput {
  userId: string;
  rawText: string;
  structured: JdStructured;
  targetRole?: string;
  status?: JdStatus;
}

export async function createJd(input: CreateJdInput): Promise<Jd> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    rawText: input.rawText,
    structured: input.structured,
    targetRole: input.targetRole,
    status: input.status ?? ("draft" as JdStatus),
    createdAt: now,
    updatedAt: now,
  };
  const id = await insertOne(Collections.JDS, doc);
  return { _id: id, ...doc } as Jd;
}

export async function getJdById(id: string, userId: string): Promise<Jd | null> {
  const jd = await findOne<Jd>(Collections.JDS, { _id: id });
  if (!jd || jd.userId !== userId) return null;
  return jd;
}

export async function listJdsByUser(
  userId: string,
  options?: { status?: JdStatus; limit?: number },
): Promise<JdListItem[]> {
  const query: Record<string, unknown> = { userId };
  if (options?.status) query.status = options.status;
  const jds = await findMany<Jd>(Collections.JDS, query, {
    orderBy: { field: "updatedAt", direction: "desc" },
    limit: options?.limit ?? 50,
  });
  return jds.map((j) => ({
    _id: j._id,
    status: j.status,
    targetRole: j.targetRole,
    structuredTitle: j.structured.title,
    structuredCompany: j.structured.company,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));
}

export interface UpdateJdInput {
  rawText?: string;
  structured?: JdStructured;
  targetRole?: string;
  status?: JdStatus;
}

export async function updateJd(
  id: string,
  userId: string,
  update: UpdateJdInput,
): Promise<void> {
  const existing = await getJdById(id, userId);
  if (!existing) throw new Error("JD 不存在或无权访问");
  await updateOne(Collections.JDS, id, update as Record<string, unknown>);
}

export async function deleteJd(id: string, userId: string): Promise<void> {
  const existing = await getJdById(id, userId);
  if (!existing) throw new Error("JD 不存在或无权访问");
  await deleteOne(Collections.JDS, id);
}
