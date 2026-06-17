/**
 * CloudBase Storage 工具
 * 用于上传/下载/删除简历文件（PDF/Word）
 */

import { getCloudBaseApp } from "./client";

export interface UploadFileOptions {
  /** 文件路径（CloudBase Storage 中的路径） */
  cloudPath: string;
  /** 文件内容（Blob/File/ArrayBuffer） */
  file: Blob | File | ArrayBuffer;
}

export interface UploadFileResult {
  fileId: string;
  downloadUrl: string;
  cloudPath: string;
}

/**
 * 上传文件到 CloudBase Storage
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
  const app = getCloudBaseApp();
  const storage = app.uploadFile;

  const result = await storage({
    cloudPath: options.cloudPath,
    filePath: options.file as unknown as string,
  });

  return {
    fileId: (result as { fileID: string }).fileID,
    downloadUrl: (result as { downloadUrl?: string }).downloadUrl ?? "",
    cloudPath: options.cloudPath,
  };
}

/**
 * 下载文件（返回 ArrayBuffer）
 */
export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const app = getCloudBaseApp();
  const result = await app.downloadFile({ fileID: fileId });
  return result as unknown as ArrayBuffer;
}

/**
 * 获取文件临时下载链接
 */
export async function getTempFileURL(fileId: string): Promise<string> {
  const app = getCloudBaseApp();
  const result = await app.getTempFileURL({ fileList: [fileId] });
  if (result.fileList && result.fileList.length > 0) {
    return result.fileList[0].tempFileURL || "";
  }
  return "";
}

/**
 * 删除文件
 */
export async function deleteFile(fileId: string): Promise<void> {
  const app = getCloudBaseApp();
  await app.deleteFile({ fileList: [fileId] });
}

/**
 * 生成简历文件存储路径
 */
export function buildResumeCloudPath(
  userId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `resumes/${userId}/${timestamp}_${safeName}`;
}
