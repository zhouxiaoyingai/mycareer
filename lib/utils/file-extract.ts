/**
 * 文本提取工具
 * 从 PDF/Word 文件提取纯文本
 * 服务端使用 pdf-parse 和 mammoth
 */

/** 服务端动态导入 pdf-parse（避免 SSR 包体积问题） */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // 动态导入避免在客户端打包
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as { default?: unknown }).default ?? pdfParseModule;
    const data = await (pdfParse as unknown as (buf: Buffer) => Promise<{ text?: string }>)(buffer);
    return data.text || "";
  } catch (err) {
    throw new Error(
      `PDF 文本提取失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** 服务端动态导入 mammoth 提取 Word 文档 */
async function extractWordText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    // mammoth 接受 { buffer } 参数（Buffer），不是 arrayBuffer
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (err) {
    throw new Error(
      `Word 文本提取失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export interface ExtractTextOptions {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface ExtractTextResult {
  text: string;
  sourceType: "upload_pdf" | "upload_word";
  fileName: string;
}

/**
 * 根据文件类型提取文本
 */
export async function extractTextFromFile(
  options: ExtractTextOptions,
): Promise<ExtractTextResult> {
  const { fileName, mimeType, buffer } = options;
  const ext = fileName.toLowerCase().split(".").pop() || "";

  let text: string;
  let sourceType: "upload_pdf" | "upload_word";

  if (ext === "pdf" || mimeType === "application/pdf") {
    text = await extractPdfText(buffer);
    sourceType = "upload_pdf";
  } else if (
    ext === "doc" ||
    ext === "docx" ||
    mimeType.includes("word") ||
    mimeType.includes("officedocument.wordprocessing")
  ) {
    text = await extractWordText(buffer);
    sourceType = "upload_word";
  } else {
    throw new Error(`不支持的文件类型: ${ext || mimeType}`);
  }

  if (!text || text.trim().length === 0) {
    throw new Error("文件内容为空，无法提取文本");
  }

  return {
    text: text.trim(),
    sourceType,
    fileName,
  };
}
