/**
 * JD 解析提示词
 * 从职位描述中提取关键词、权重、技能要求
 */

export interface JdParseInput {
  jdText: string;
  targetRole?: string;
}

export const JD_PARSE_SYSTEM_PROMPT = `你是一个专业的职位描述（JD）解析助手。任务是从 JD 文本中提取结构化信息。

# 解析规则

## 必须提取的字段
- title: 职位标题
- company: 公司名（如 JD 中提及）
- location: 工作地点
- employmentType: 全职/兼职/实习
- experienceLevel: 初级/中级/高级/专家
- hardSkills: 硬技能列表（技术栈、工具、框架）+ 权重（1-5）
- softSkills: 软技能列表 + 权重（1-5）
- industryTerms: 行业术语 + 权重（1-5）
- responsibilities: 岗位职责列表
- requirements: 任职要求列表
- niceToHave: 加分项列表

## 权重判定
- 5: 明确要求且为核心（如"必须精通 React"）
- 4: 明确要求但非核心（如"熟悉 React 优先"）
- 3: 隐含要求或常见搭配
- 2: 加分项
- 1: 提及但不重要

## 输出格式（严格 JSON）
\`\`\`json
{
  "title": "string",
  "company": "string（可选，JD 未提及则留空字符串）",
  "location": "string（可选，JD 未提及则留空字符串）",
  "employmentType": "全职 | 兼职 | 实习",
  "experienceLevel": "初级 | 中级 | 高级 | 专家",
  "hardSkills": [
    { "name": "React", "weight": 5, "context": "必须精通" }
  ],
  "softSkills": [
    { "name": "团队协作", "weight": 4, "context": "跨部门协作" }
  ],
  "industryTerms": [
    { "name": "SaaS", "weight": 3, "context": "SaaS 产品经验优先" }
  ],
  "responsibilities": ["职责1", "职责2"],
  "requirements": ["要求1", "要求2"],
  "niceToHave": ["加分项1"]
}
\`\`\`

## 注意事项
- 输出必须是合法 JSON
- 所有字段必须存在，未提及的字段使用空字符串 "" 或空数组 []
- 严禁输出 undefined、null 等 JS 值，未提及的字段一律用空字符串
- 技能名称统一规范化（如 "js" → "JavaScript"）
- 不可编造 JD 中未提及的技能
- 权重基于 JD 中的措辞强度判定`;

export function buildJdParseUserMessage(input: JdParseInput): string {
  const targetRoleLine = input.targetRole ? `\n目标岗位：${input.targetRole}` : "";

  return `请解析以下职位描述（JD），提取结构化信息。${targetRoleLine}

# JD 原文

${input.jdText}

请严格按照系统提示词中的 JSON 格式输出。`;
}

export function buildJdParseMessages(input: JdParseInput) {
  return [
    { role: "system" as const, content: JD_PARSE_SYSTEM_PROMPT },
    { role: "user" as const, content: buildJdParseUserMessage(input) },
  ];
}

export interface JdParseResult {
  title: string;
  company?: string;
  location?: string;
  employmentType: string;
  experienceLevel: string;
  hardSkills: Array<{ name: string; weight: number; context: string }>;
  softSkills: Array<{ name: string; weight: number; context: string }>;
  industryTerms: Array<{ name: string; weight: number; context: string }>;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

export function parseJdParseResult(raw: string): JdParseResult {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // 防御性处理：AI 可能输出 undefined/null 等 JS 值，替换为空字符串
    const sanitized = cleaned
      .replace(/:\s*undefined\s*([,}])/g, ': ""$1')
      .replace(/:\s*null\s*([,}])/g, ': ""$1');
    const parsed = JSON.parse(sanitized);
    return {
      title: parsed.title ?? "",
      company: parsed.company || undefined,
      location: parsed.location || undefined,
      employmentType: parsed.employmentType ?? "全职",
      experienceLevel: parsed.experienceLevel ?? "中级",
      hardSkills: Array.isArray(parsed.hardSkills) ? parsed.hardSkills : [],
      softSkills: Array.isArray(parsed.softSkills) ? parsed.softSkills : [],
      industryTerms: Array.isArray(parsed.industryTerms) ? parsed.industryTerms : [],
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      niceToHave: Array.isArray(parsed.niceToHave) ? parsed.niceToHave : [],
    };
  } catch (err) {
    throw new Error(`JD 解析结果解析失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}
