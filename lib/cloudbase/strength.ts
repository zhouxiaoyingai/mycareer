/**
 * 优势识别报告数据访问层
 */

import { Collections, insertOne, findOne, findMany, updateOne, deleteOne } from "./db";
import type { StrengthReport, StrengthReportContent } from "@/types/strength";

export interface CreateStrengthReportInput {
  userId: string;
  answers: StrengthReport["answers"];
}

export async function createStrengthReport(
  input: CreateStrengthReportInput
): Promise<StrengthReport> {
  const now = new Date();
  const doc = {
    userId: input.userId,
    answers: input.answers,
    status: "in_progress" as const,
    createdAt: now,
    updatedAt: now,
  };
  const id = await insertOne(Collections.STRENGTH_REPORTS, doc);
  return { _id: id, ...doc } as StrengthReport;
}

export async function getStrengthReportById(
  id: string,
  userId: string
): Promise<StrengthReport | null> {
  const report = await findOne<StrengthReport>(Collections.STRENGTH_REPORTS, { _id: id });
  if (!report || report.userId !== userId) {
    return null;
  }
  return report;
}

export async function listStrengthReportsByUser(
  userId: string,
  limit = 10,
  offset = 0
): Promise<{ reports: StrengthReport[]; total: number }> {
  const allReports = await findMany<StrengthReport>(
    Collections.STRENGTH_REPORTS,
    { userId },
    { orderBy: { field: "createdAt", direction: "desc" } }
  );
  return {
    reports: allReports.slice(offset, offset + limit),
    total: allReports.length,
  };
}

export async function updateStrengthReportContent(
  id: string,
  userId: string,
  report: StrengthReportContent
): Promise<void> {
  const existing = await getStrengthReportById(id, userId);
  if (!existing) {
    throw new Error("报告不存在或无权访问");
  }
  await updateOne(Collections.STRENGTH_REPORTS, id, { report, status: "completed" });
}

export async function updateStrengthReportStatus(
  id: string,
  userId: string,
  status: StrengthReport["status"]
): Promise<void> {
  const existing = await getStrengthReportById(id, userId);
  if (!existing) {
    throw new Error("报告不存在或无权访问");
  }
  await updateOne(Collections.STRENGTH_REPORTS, id, { status });
}

export async function deleteStrengthReport(id: string, userId: string): Promise<void> {
  const existing = await getStrengthReportById(id, userId);
  if (!existing) {
    throw new Error("报告不存在或无权访问");
  }
  await deleteOne(Collections.STRENGTH_REPORTS, id);
}
