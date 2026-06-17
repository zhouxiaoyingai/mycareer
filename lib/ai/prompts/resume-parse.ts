/**
 * 简历解析提示词
 * 将用户上传/粘贴的简历原文解析为结构化数据
 */

import { injectAntiHallucinationRules } from "./shared/anti-hallucination";
import { PROVENANCE_PROMPT_FRAGMENT } from "./shared/provenance-rules";

export interface ResumeParseInput {
  rawContent: string;
  sourceType: "upload_pdf" | "upload_word" | "paste" | "form" | "ai_chat";
  hint?: string;
}

export const RESUME_PARSE_SYSTEM_PROMPT = injectAntiHallucinationRules(
  `你是一个专业的简历解析助手。任务是将用户提供的简历原文解析为结构化 JSON 数据。

# 解析规则

## 必须提取的字段
- contact: 联系信息（姓名、邮箱、电话、所在地、个人网站、GitHub、LinkedIn）
- summary: 个人简介（如有）
- experiences: 工作经历数组（公司、职位、起止时间、bullet 点列表）
- projects: 项目经历数组（项目名、角色、描述、bullet 点、链接）
- education: 教育经历数组（学校、学位、专业、起止时间、GPA）
- skills: 技能（technical/技术栈、languages/编程语言、tools/工具、certifications/证书）

## 解析原则
1. 忠于原文：不可编造、不可补充原文没有的信息
2. 缺失字段处理：
   - 必填字段缺失 → 使用占位符（如 \`[电话待填写]\`）
   - 选填字段缺失 → 留空或省略
3. 时间格式统一为 \`YYYY-MM\`，无法解析的保留原文并标注
4. bullet 点保持原文表述，仅做格式统一（format_unify）
5. 技能分类基于原文明确提及的内容，不推断

## 输出格式（严格 JSON）
\`\`\`json
{
  "structured": {
    "contact": {
      "name": "string | [姓名待填写]",
      "email": "string | [邮箱待填写]",
      "phone": "string | [电话待填写]",
      "location": "string",
      "website": "string",
      "github": "string",
      "linkedin": "string"
    },
    "summary": "string | undefined",
    "experiences": [
      {
        "id": "exp_0",
        "company": "string",
        "title": "string",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM | undefined",
        "current": false,
        "bullets": ["原文 bullet 1", "原文 bullet 2"]
      }
    ],
    "projects": [
      {
        "id": "proj_0",
        "name": "string",
        "role": "string | undefined",
        "description": "string | undefined",
        "bullets": ["原文 bullet 1"],
        "link": "string | undefined"
      }
    ],
    "education": [
      {
        "id": "edu_0",
        "school": "string",
        "degree": "string",
        "major": "string",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM | undefined",
        "gpa": "string | undefined"
      }
    ],
    "skills": {
      "technical": ["React", "Node.js"],
      "languages": ["JavaScript", "Python"],
      "tools": ["Git", "Docker"],
      "certifications": ["AWS Certified"]
    }
  },
  "provenance": [
    {
      "field": "contact.name",
      "fromOriginal": "原文片段",
      "rewriteAction": "format_unify",
      "hallucinationRisk": "low"
    }
  ]
}
\`\`\`

${PROVENANCE_PROMPT_FRAGMENT}

## 注意事项
- 输出必须是合法 JSON，不可包含注释或尾随逗号
- bullet 点数量保持原文，不可合并或拆分
- 同一信息出现在多处时，取最完整的版本
- 原文为英文时，结构化字段保留英文；原文为中文时保留中文
- 不可将翻译后的内容作为结构化数据`,
);

/**
 * 构建简历解析的用户消息
 */
export function buildResumeParseUserMessage(input: ResumeParseInput): string {
  const sourceLabel = {
    upload_pdf: "PDF 上传",
    upload_word: "Word 上传",
    paste: "粘贴文本",
    form: "表单填写",
    ai_chat: "AI 对话引导",
  }[input.sourceType];

  const hint = input.hint ? `\n\n用户提示：${input.hint}` : "";

  return `请解析以下简历原文（来源：${sourceLabel}），输出结构化 JSON。

# 简历原文

${input.rawContent}${hint}

请严格按照系统提示词中的 JSON 格式输出，确保所有字段完整。`;
}

/**
 * 获取简历解析的完整消息列表
 */
export function buildResumeParseMessages(input: ResumeParseInput) {
  return [
    { role: "system" as const, content: RESUME_PARSE_SYSTEM_PROMPT },
    { role: "user" as const, content: buildResumeParseUserMessage(input) },
  ];
}
