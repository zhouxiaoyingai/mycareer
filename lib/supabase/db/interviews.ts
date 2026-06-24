// lib/supabase/db/interviews.ts
import { createClient } from "../server";
import type { Interview, InterviewStatus, InterviewQuestion, QuestionType, ResumeSnapshot, JdSnapshot } from "@/types/interview";

export type { Interview, InterviewStatus, InterviewQuestion, QuestionType, ResumeSnapshot, JdSnapshot };

export interface CreateInterviewInput {
  userId: string;
  resumeId: string;
  jdId: string;
  resumeSnapshot: ResumeSnapshot;
  jdSnapshot: JdSnapshot;
  questionTypes: QuestionType[];
  questions: InterviewQuestion[];
}

export async function listInterviewsByUser(
  userId: string,
  opts?: { jdId?: string; limit?: number }
): Promise<Interview[]> {
  const supabase = await createClient();
  let query = supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (opts?.jdId) query = query.eq("jd_id", opts.jdId);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listInterviewsByUser failed: ${error.message}`);
  return (data ?? []) as Interview[];
}

export async function getInterviewById(
  userId: string,
  id: string
): Promise<Interview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Interview;
}

export async function createInterview(
  input: CreateInterviewInput
): Promise<Interview> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .insert({
      user_id: input.userId,
      resume_id: input.resumeId,
      jd_id: input.jdId,
      resume_snapshot: input.resumeSnapshot,
      jd_snapshot: input.jdSnapshot,
      question_types: input.questionTypes,
      questions: input.questions,
      status: "generated",
    })
    .select()
    .single();
  if (error || !data) throw new Error(`createInterview failed: ${error?.message}`);
  return data as Interview;
}

export async function updateInterview(
  userId: string,
  id: string,
  patch: Partial<Pick<Interview, "status" | "questions" | "question_types">>
): Promise<Interview> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateInterview failed: ${error?.message}`);
  return data as Interview;
}

export async function deleteInterview(
  userId: string,
  id: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("interviews")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteInterview failed: ${error.message}`);
}
