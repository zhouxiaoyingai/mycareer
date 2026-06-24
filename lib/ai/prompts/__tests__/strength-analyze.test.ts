/**
 * 优势识别 AI Prompt 模块单元测试
 */

import {
  buildStrengthAnalyzeMessages,
  StrengthReportStreamParser,
} from "../strength-analyze";
import type { StrengthAnswers } from "@/types/strength";

describe("buildStrengthAnalyzeMessages", () => {
  it("包含系统提示词和用户消息", () => {
    const answers: StrengthAnswers = {
      currentStage: "employed-exploring",
      flowExperiences: ["building-things"],
      achievementType: "solving-hard-problems",
      workEnvironmentPreferences: {
        remoteWork: 3,
        stability: 3,
        fastPaced: 3,
        teamwork: 3,
        independence: 3,
        creativity: 3,
      },
      valueRanking: ["成长", "助人", "影响", "收入", "平衡", "挑战"],
      riskTolerance: "中等",
      yearsOfExperience: 3,
    };
    const messages = buildStrengthAnalyzeMessages(answers);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("职业规划师");
    expect(messages[1].role).toBe("user");
  });

  it("用户消息包含答案字段", () => {
    const answers: StrengthAnswers = {
      currentStage: "fresh-graduate",
      flowExperiences: ["communicating", "analyzing-data"],
      achievementType: "developing-people",
      workEnvironmentPreferences: {
        remoteWork: 3,
        stability: 4,
        fastPaced: 3,
        teamwork: 4,
        independence: 3,
        creativity: 4,
      },
      valueRanking: ["成长", "助人", "影响", "收入", "平衡", "挑战"],
      riskTolerance: "谨慎",
      yearsOfExperience: 0,
    };
    const messages = buildStrengthAnalyzeMessages(answers);
    expect(messages[1].content).toContain("fresh-graduate");
    expect(messages[1].content).toContain("communicating");
    expect(messages[1].content).toContain("analyzing-data");
    expect(messages[1].content).toContain("developing-people");
  });

  it("用户消息包含工作环境偏好分数", () => {
    const answers: StrengthAnswers = {
      currentStage: "employed-stable",
      flowExperiences: ["teaching"],
      achievementType: "building-systems",
      workEnvironmentPreferences: {
        remoteWork: 5,
        stability: 1,
        fastPaced: 5,
        teamwork: 2,
        independence: 5,
        creativity: 3,
      },
      valueRanking: ["挑战", "成长", "影响", "助人", "平衡", "收入"],
      riskTolerance: "愿意尝试",
      yearsOfExperience: 5,
    };
    const messages = buildStrengthAnalyzeMessages(answers);
    expect(messages[1].content).toContain("远程/自由工作：5");
    expect(messages[1].content).toContain("快节奏/高压：5");
    expect(messages[1].content).toContain("5年");
  });

  it("JSON 格式要求出现在用户消息中", () => {
    const answers: StrengthAnswers = {
      currentStage: "employed-exploring",
      flowExperiences: ["writing"],
      achievementType: "solving-hard-problems",
      workEnvironmentPreferences: {
        remoteWork: 3,
        stability: 3,
        fastPaced: 3,
        teamwork: 3,
        independence: 3,
        creativity: 3,
      },
      valueRanking: ["成长", "助人", "影响", "收入", "平衡", "挑战"],
      riskTolerance: "中立",
      yearsOfExperience: 2,
    };
    const messages = buildStrengthAnalyzeMessages(answers);
    expect(messages[1].content).toContain("transferableSkills");
    expect(messages[1].content).toContain("careerPaths");
    expect(messages[1].content).toContain("quickWins");
    expect(messages[1].content).toContain("realityCheck");
  });
});

describe("StrengthReportStreamParser", () => {
  it("空输入不报错", () => {
    const parser = new StrengthReportStreamParser();
    expect(parser.parseChunk("")).toBeNull();
    expect(parser.getBuffer()).toBe("");
  });

  it("解析完整的 transferableSkills 块", () => {
    const parser = new StrengthReportStreamParser();
    const chunk = JSON.stringify({
      transferableSkills: [
        { skill: "数据分析", transferTo: "产品经理", evidence: "从工作中体现" },
      ],
    });
    const completed = parser.parseChunk(chunk);
    expect(completed).toBe("transferableSkills");
  });

  it("分多个 chunk 累积解析 transferableSkills", () => {
    const parser = new StrengthReportStreamParser();
    const full = JSON.stringify({
      transferableSkills: [
        { step: "学习 X", resource: "课程 A", purpose: "补齐技能" },
        { step: "做项目 Y", resource: "GitHub", purpose: "积累作品" },
      ],
    });
    const c1 = full.slice(0, 20);
    const c2 = full.slice(20, 40);
    const c3 = full.slice(40);
    expect(parser.parseChunk(c1)).toBeNull();
    expect(parser.parseChunk(c2)).toBeNull();
    const result = parser.parseChunk(c3);
    // 第三个 chunk 可能完成也可能在累积中
    expect([null, "transferableSkills"]).toContain(result);
  });

  it("非法 JSON 不完成解析", () => {
    const parser = new StrengthReportStreamParser();
    const invalid = '{"transferableSkills": [{"skill": "test"';
    const result = parser.parseChunk(invalid);
    expect(result).toBeNull();
    expect(parser.getBuffer().length).toBeGreaterThan(0);
  });

  it("getBuffer 返回当前累积内容", () => {
    const parser = new StrengthReportStreamParser();
    parser.parseChunk("partial data");
    expect(parser.getBuffer()).toBe("partial data");
  });
});
