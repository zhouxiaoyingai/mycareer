// lib/supabase/db/resumes.ts
import { createClient } from "../server";
import type { Resume, ResumeSourceType, ResumeStatus, ResumeType } from "@/types/resume";

export type { Resume, ResumeSourceType, ResumeStatus, ResumeType };

export interface CreateResumeInput {
  userId: string;
  type: ResumeType;
  sourceType: ResumeSourceType;
  rawContent: string;
  structured: Resume["structured"];
  sourceFileId?: string;
  targetRole?: string;
  parentId?: string;
  status?: ResumeStatus;
}

export async function listResumesByUser(
  userId: string,
  opts?: { type?: string; status?: string; limit?: number }
): Promise<Resume[]> {
  const supabase = await createClient();
  let query = supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (opts?.type) query = query.eq("type", opts.type);
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listResumesByUser failed: ${error.message}`);
  return (data ?? []) as Resume[];
}

export async function getResumeById(
  userId: string,
  id: string
): Promise<Resume | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Resume;
}

export async function createResume(input: CreateResumeInput): Promise<Resume> {
  const supabase = await createClient();
  const row = {
    user_id: input.userId,
    type: input.type,
    source_type: input.sourceType,
    raw_content: input.rawContent,
    structured: input.structured,
    source_file_id: input.sourceFileId ?? null,
    target_role: input.targetRole ?? null,
    parent_id: input.parentId ?? null,
    status: input.status ?? "draft",
  };
  const { data, error } = await supabase
    .from("resumes")
    .insert(row)
    .select()
    .single();
  if (error || !data) throw new Error(`createResume failed: ${error?.message}`);
  return data as Resume;
}

export async function updateResume(
  userId: string,
  id: string,
  patch: Partial<Omit<Resume, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Resume> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`updateResume failed: ${error?.message}`);
  return data as Resume;
}

export async function deleteResume(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteResume failed: ${error.message}`);
}
