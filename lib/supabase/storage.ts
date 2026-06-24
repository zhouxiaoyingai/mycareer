import { createServiceClient } from "./service";
import { createClient } from "./server";

const BUCKET = "resumes";

export interface UploadFileOptions {
  userId: string;
  fileName: string;
  file: File | Blob | ArrayBuffer;
}

export interface UploadFileResult {
  path: string;
}

/**
 * 上传简历文件到 Supabase Storage
 * 用 service client 绕过 RLS（userId 已在调用前验证）
 */
export async function uploadResume(
  options: UploadFileOptions
): Promise<UploadFileResult> {
  const supabase = createServiceClient();
  const path = buildResumePath(options.userId, options.fileName);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, options.file, { upsert: false });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  return { path };
}

/**
 * 生成简历临时下载 URL（1 小时有效）
 */
export async function getResumeSignedUrl(path: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data) {
    throw new Error(`Get URL failed: ${error?.message ?? "no data"}`);
  }
  return data.signedUrl;
}

/**
 * 删除简历文件
 */
export async function deleteResume(path: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * 生成简历文件存储路径
 * 格式：{userId}/{timestamp}_{safeName}
 */
export function buildResumePath(
  userId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${timestamp}_${safeName}`;
}
