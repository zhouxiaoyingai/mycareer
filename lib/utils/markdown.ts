/**
 * Markdown 工具
 * 简历 Markdown 内容的解析、清理、占位符高亮等
 */

/** 简历中的占位符模式 */
export const PLACEHOLDER_PATTERNS = [
  /____%/g, // 量化占位符
  /\[待填写[^\]]*\]/g, // 待填写占位符
  /\[电话待填写\]/g,
  /\[邮箱待填写\]/g,
  /\[姓名待填写\]/g,
  /\[缺失\]/g,
  /\[电话待填写\]/g,
] as const;

/**
 * 检测 Markdown 中的占位符
 */
export function detectPlaceholders(markdown: string): string[] {
  const placeholders: string[] = [];
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = markdown.match(pattern);
    if (matches) {
      placeholders.push(...matches);
    }
  }
  return [...new Set(placeholders)];
}

/**
 * 统计占位符数量
 */
export function countPlaceholders(markdown: string): number {
  let count = 0;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const matches = markdown.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * 将占位符转换为 HTML 高亮标记（用于预览）
 */
export function highlightPlaceholders(markdown: string): string {
  let result = markdown;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    result = result.replace(
      pattern,
      (match) => `<mark class="placeholder">${match}</mark>`,
    );
  }
  return result;
}

/**
 * 清理 Markdown 内容（去除多余空行、统一格式）
 */
export function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/**
 * 提取 Markdown 中的各模块内容
 */
export interface ResumeSections {
  contact?: string;
  summary?: string;
  experiences?: string;
  projects?: string;
  education?: string;
  skills?: string;
  others?: string[];
}

export function extractSections(markdown: string): ResumeSections {
  const sections: ResumeSections = { others: [] };
  const lines = markdown.split("\n");
  let currentSection: keyof ResumeSections | null = null;
  let currentContent: string[] = [];

  const sectionMap: Record<string, keyof ResumeSections> = {
    "联系方式": "contact",
    "联系信息": "contact",
    "contact": "contact",
    "个人简介": "summary",
    "简介": "summary",
    "summary": "summary",
    "about": "summary",
    "工作经历": "experiences",
    "经历": "experiences",
    "experience": "experiences",
    "项目经历": "projects",
    "项目": "projects",
    "projects": "projects",
    "教育经历": "education",
    "教育": "education",
    "education": "education",
    "技能": "skills",
    "skills": "skills",
  };

  const flush = () => {
    if (currentSection && currentContent.length > 0) {
      const content = currentContent.join("\n").trim();
      if (currentSection === "others") {
        sections.others?.push(content);
      } else {
        (sections[currentSection] as string) = content;
      }
    }
    currentContent = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flush();
      const heading = headingMatch[1].trim().toLowerCase();
      currentSection = sectionMap[heading] || "others";
    } else {
      currentContent.push(line);
    }
  }
  flush();

  return sections;
}

/**
 * 统计 Markdown 字数（中文按字，英文按词）
 */
export function countWords(markdown: string): { zh: number; en: number; total: number } {
  const chineseChars = (markdown.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (markdown.match(/[a-zA-Z]+/g) || []).length;
  return {
    zh: chineseChars,
    en: englishWords,
    total: chineseChars + englishWords,
  };
}

/**
 * 估算 Markdown 渲染后的简历页数
 */
export function estimatePages(markdown: string): number {
  const { total } = countWords(markdown);
  // 中文约 600-800 字/页，英文约 400-600 词/页，取中间值
  if (total <= 700) return 1;
  if (total <= 1400) return 2;
  return Math.ceil(total / 700);
}

/**
 * 将 Markdown 转换为纯文本（用于 AI 输入）
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
