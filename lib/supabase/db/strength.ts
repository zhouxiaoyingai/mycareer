// lib/supabase/db/strength.ts
import { createClient } from "../server";
import { generateStrengthReport } from "@/lib/ai/prompts/strength-analyze";

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

export interface StrengthReportData {
  transferableSkills: Array<{ skill: string; transferTo: string; evidence: string }>;
  careerPaths: Array<{
    careerName: string;
    industry: string;
    skillMatch: string;
    entryPath: string;
    salaryRange: string;
    searchStrategy: string;
    transitionTime: string;
  }>;
  quickWins: Array<{ step: string; resource: string; purpose: string }>;
  realityCheck: {
    bestFit: string;
    timelines: Array<{ path: string; phase: string; duration: string }>;
  };
}

export interface StrengthReport {
  id: string;
  user_id: string;
  answers: StrengthAnswers;
  report: StrengthReportData | null;
  status: "in_progress" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface CreateStrengthReportInput {
  userId: string;
  answers: StrengthAnswers;
}

export async function listStrengthReportsByUser(
  userId: string,
  limit = 10,
  offset = 0
): Promise<StrengthReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`listStrengthReportsByUser failed: ${error.message}`);
  return (data ?? []) as StrengthReport[];
}

export async function getStrengthReportById(
  userId: string,
  id: string
): Promise<StrengthReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as StrengthReport;
}

export async function createStrengthReport(
  input: CreateStrengthReportInput
): Promise<StrengthReport> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .insert({
      user_id: input.userId,
      answers: input.answers,
      report: null,
      status: "in_progress",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createStrengthReport failed: ${error?.message}`);
  return data as StrengthReport;
}

export async function updateStrengthReport(
  userId: string,
  id: string,
  patch: Partial<Pick<StrengthReport, "report" | "status">>
): Promise<StrengthReport> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strength_reports")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data)
    throw new Error(`updateStrengthReport failed: ${error?.message}`);
  return data as StrengthReport;
}

export async function deleteStrengthReport(
  userId: string,
  id: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("strength_reports")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteStrengthReport failed: ${error.message}`);
}

/**
 * 同步生成报告内容并保存(由 API 路由调用)
 * 1. 读取报告(校验权限)
 * 2. 调用 AI 生成报告内容
 * 3. 写入 report + status: completed
 * 失败时更新 status: failed
 */
export async function generateAndSaveReport(
  reportId: string,
  userId: string
): Promise<StrengthReportData> {
  const report = await getStrengthReportById(userId, reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  try {
    const result = await generateStrengthReport(report.answers);
    const data: StrengthReportData = {
      transferableSkills: result.transferableSkills,
      careerPaths: result.careerPaths,
      quickWins: result.quickWins,
      realityCheck: result.realityCheck,
    };
    await updateStrengthReport(userId, reportId, {
      report: data,
      status: "completed",
    });
    return data;
  } catch (err) {
    await updateStrengthReport(userId, reportId, { status: "failed" });
    throw err;
  }
}
