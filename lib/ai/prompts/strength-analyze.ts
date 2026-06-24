/**
 * 优势识别 AI 分析提示词
 * 基于用户问卷答案，生成可迁移技能和职业路径建议
 */

import type {
  StrengthAnswers,
  StrengthReportContent,
  TransferableSkill,
  CareerPath,
  QuickWin,
  RealityCheck,
} from "@/types/strength";
import { callDeepSeekForJSON } from "../deepseek";

const SYSTEM_PROMPT = `你是一位资深职业规划师和 HR，擅长从长期眼光发现人才的潜在优势。
你的职责是分析用户的技能、经验和兴趣，发现他们可能的职业规划路径。
你强调的是可迁移技能而非直接经验，为用户提供具体可执行的职业发展建议。

回答要求：
- 语言：与用户输入一致（中文）
- 薪资范围必须注明"仅供参考，来源于公开数据，不构成就业承诺"
- 投递方式提供搜索策略，不提供具体链接
- 不知道就说"暂无公开数据"，不编造
- 每个职业路径说明为什么要适合用户，基于哪些具体技能
`;

function buildUserContext(answers: StrengthAnswers): string {
  const flowList = answers.flowExperiences
    .map((f, i) => `  ${i + 1}. ${f}`)
    .join("\n");

  const valueList = answers.valueRanking
    .map((v, i) => `  ${i + 1}. ${v}`)
    .join("\n");

  const wp = answers.workEnvironmentPreferences;

  return `用户职业背景信息：

1. 当前阶段：${answers.currentStage}
   职业方向清晰度：${answers.careerClarity || "未填写"}

2. 心流体验（做这些事时最有投入感）：
${flowList}

3. 最有成就感的经历类型：
${answers.achievementType}
${answers.achievementStory ? `\n   经历简述：${answers.achievementStory}` : "\n   经历简述：无"}

4. 工作环境偏好（1-5分）：
  - 远程/自由工作：${wp.remoteWork}
  - 稳定/可预期：${wp.stability}
  - 快节奏/高压：${wp.fastPaced}
  - 团队协作多：${wp.teamwork}
  - 独立自主多：${wp.independence}
  - 创意/自由度：${wp.creativity}

5. 工作价值观排序（从最重要到最不重要）：
${valueList}

6. 风险承受力：
${answers.riskTolerance}

7. 学习风格：${answers.learningStyle?.join("、") || "未填写"}
   工作年限：${answers.yearsOfExperience}年`;
}

/**
 * 构建发送给 DeepSeek 的消息列表
 */
export function buildStrengthAnalyzeMessages(
  answers: StrengthAnswers
): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        buildUserContext(answers) +
        "\n\n请基于以上信息，以 JSON 格式输出职业发展报告，格式要求如下：\n\n{\n  \"transferableSkills\": [...],  // 3-5个条目\n  \"careerPaths\": [...],         // 5-7个条目\n  \"quickWins\": [...],           // 3个条目\n  \"realityCheck\": {...}          // 现实检验\n}",
    },
  ];
}

/**
 * 流式解析器：从 DeepSeek 返回的文本流中逐步提取 JSON
 */
export class StrengthReportStreamParser {
  private buffer = "";

  /**
   * 处理一个文本 chunk，返回解析出的完整 section 名称（如果完成了一个）
   * 返回 null 表示还需要更多文本
   */
  public parseChunk(chunk: string): string | null {
    this.buffer += chunk;

    const reportKeys = [
      "transferableSkills",
      "careerPaths",
      "quickWins",
      "realityCheck",
    ] as const;

    for (const key of reportKeys) {
      // 查找 "key": 的位置
      const keyIndex = this.buffer.indexOf(`"${key}"`);
      if (keyIndex === -1) continue;

      // 找到冒号后的内容
      const colonIndex = this.buffer.indexOf(":", keyIndex);
      if (colonIndex === -1) continue;

      const content = this.buffer.slice(colonIndex + 1).trim();
      if (!content.startsWith("[") && !content.startsWith("{")) continue;

      // 尝试找到闭合
      let depth = 0;
      let endIndex = -1;
      for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") {
          depth--;
          if (depth === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }

      if (endIndex === -1) continue;

      const jsonStr = content.slice(0, endIndex);
      try {
        JSON.parse(jsonStr); // 验证是否合法
        this.buffer = this.buffer.slice(keyIndex + key.length + 2);
        return key;
      } catch {
        // 不完整，继续累积
      }
    }

    return null;
  }

  public getBuffer(): string {
    return this.buffer;
  }
}

export type { StrengthReportContent };
export type {
  TransferableSkill,
  CareerPath,
  QuickWin,
  RealityCheck,
};

/**
 * 同步生成优势报告（一次性调用 DeepSeek 解析 JSON）
 * 纯函数：只负责 AI 调用和数据组装，不读写数据库。
 * 由 POST /api/strength/reports 在后台调用，调用方负责持久化结果。
 * @param answers 问卷答案
 * @returns AI 生成的报告内容
 */
export async function generateStrengthReport(
  answers: StrengthAnswers
): Promise<StrengthReportContent> {
  // 1. 构造消息
  const messages = buildStrengthAnalyzeMessages(answers);

  // 2. 一次性调用 DeepSeek（JSON 格式）
  type GeneratedReport = {
    transferableSkills: TransferableSkill[];
    careerPaths: CareerPath[];
    quickWins: QuickWin[];
    realityCheck: RealityCheck;
  };
  let generated: GeneratedReport;
  try {
    generated = await callDeepSeekForJSON<GeneratedReport>(messages, {
      temperature: 0.7,
      maxTokens: 4096,
    });
  } catch (err) {
    console.error(`[strength] DeepSeek call failed:`, err);
    throw err;
  }

  // 3. 组装报告
  return {
    ...generated,
    generatedAt: new Date(),
  };
}
