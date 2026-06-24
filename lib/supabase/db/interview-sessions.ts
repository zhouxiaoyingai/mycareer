// lib/supabase/db/interview-sessions.ts
import { createClient } from "../server";
import type { InterviewSession, SessionAnswer, SessionStatus } from "@/types/interview";

export type { InterviewSession, SessionAnswer, SessionStatus };

export interface CreateSessionInput {
  userId: string;
  interviewId: string;
  status?: SessionStatus;
}

export interface SessionStats {
  sessionCount: number;
  bestScore: number | null;
}

export async function listSessionsByInterview(
  userId: string,
  interviewId: string
): Promise<InterviewSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("interview_id", interviewId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listSessionsByInterview failed: ${error.message}`);
  return (data ?? []) as InterviewSession[];
}

export async function getSessionById(
  userId: string,
  id: string
): Promise<InterviewSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as InterviewSession;
}

export async function createSession(
  input: CreateSessionInput
): Promise<InterviewSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: input.userId,
      interview_id: input.interviewId,
      status: "in_progress",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createSession failed: ${error?.message}`);
  return data as InterviewSession;
}

export async function updateSession(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      InterviewSession,
      "answers" | "overall_score" | "overall_feedback" | "status"
    >
  >
): Promise<InterviewSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateSession failed: ${error?.message}`);
  return data as InterviewSession;
}

export async function getSessionStatsByInterviewIds(
  interviewIds: string[],
  userId: string
): Promise<Map<string, SessionStats>> {
  const supabase = await createClient();
  if (interviewIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("interview_id, overall_score")
    .eq("user_id", userId)
    .in("interview_id", interviewIds);
  if (error)
    throw new Error(`getSessionStatsByInterviewIds failed: ${error.message}`);
  const map = new Map<string, SessionStats>();
  for (const row of data ?? []) {
    const stats = map.get(row.interview_id) ?? {
      sessionCount: 0,
      bestScore: null,
    };
    stats.sessionCount += 1;
    if (row.overall_score !== null) {
      stats.bestScore = Math.max(stats.bestScore ?? 0, row.overall_score);
    }
    map.set(row.interview_id, stats);
  }
  return map;
}
