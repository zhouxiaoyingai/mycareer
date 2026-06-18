import {
  GREETING_SYSTEM_PROMPT,
  buildGreetingMessages,
  parseGreetingResult,
} from "../greeting";
import type { MatchAnalysis } from "@/types/jd";

describe("greeting 提示词", () => {
  it("系统提示词应包含防幻觉规则", () => {
    expect(GREETING_SYSTEM_PROMPT).toContain("防幻觉三维度规则");
  });

  it("系统提示词应包含字数要求", () => {
    expect(GREETING_SYSTEM_PROMPT).toContain("50-100");
  });

  it("系统提示词应禁止 AI 味词", () => {
    expect(GREETING_SYSTEM_PROMPT).toContain("赋能");
  });

  it("buildGreetingMessages 应包含 JD 和匹配分析", () => {
    const matchAnalysis: MatchAnalysis = {
      matchScore: 80,
      matchDetails: [
        { skill: "React", status: "matched", weight: 5, evidence: "3年经验" },
        { skill: "K8s", status: "missing", weight: 3, evidence: "未提及" },
      ],
      gapAnalysis: "缺失 K8s",
    };
    const messages = buildGreetingMessages({
      jdTitle: "高级前端工程师",
      matchAnalysis,
      resumeZhContent: "张三，5年前端工程师，精通 React",
    });
    expect(messages[1].content).toContain("高级前端工程师");
    expect(messages[1].content).toContain("React");
    expect(messages[1].content).toContain("张三");
    expect(messages[1].content).toContain("80");
  });

  it("parseGreetingResult 应正确解析", () => {
    const raw = JSON.stringify({
      text: "您好，我是有5年前端经验的工程师，熟悉 React，期待进一步沟通。",
    });
    const result = parseGreetingResult(raw);
    expect(result.text).toContain("您好");
    expect(result.text.length).toBeGreaterThan(10);
  });

  it("parseGreetingResult 应在缺少 text 时抛错", () => {
    const raw = JSON.stringify({ foo: "bar" });
    expect(() => parseGreetingResult(raw)).toThrow("打招呼短文解析失败");
  });
});
