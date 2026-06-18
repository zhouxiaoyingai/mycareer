import {
  INTERVIEW_SCORE_SYSTEM_PROMPT,
  buildInterviewScoreMessages,
  parseInterviewScoreResult,
} from "../interview-score";
import type { InterviewQuestion } from "@/types/interview";

describe("interview-score 提示词", () => {
  it("系统提示词应包含防幻觉规则", () => {
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("防幻觉三维度规则");
  });

  it("系统提示词应包含评分标准", () => {
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("90-100");
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("70-89");
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("50-69");
    expect(INTERVIEW_SCORE_SYSTEM_PROMPT).toContain("0-49");
  });

  it("buildInterviewScoreMessages 应包含题目和用户答案", () => {
    const question: InterviewQuestion = {
      id: "q1",
      type: "technical",
      question: "说说 React Fiber",
      referenceAnswer: "Fiber 是...",
      answerStrategy: "从架构动机回答",
    };
    const messages = buildInterviewScoreMessages({
      question,
      userAnswer: "Fiber 是 React 16 的架构",
      resumeZhContent: "张三，5年前端工程师",
    });
    expect(messages[1].content).toContain("说说 React Fiber");
    expect(messages[1].content).toContain("Fiber 是...");
    expect(messages[1].content).toContain("Fiber 是 React 16 的架构");
    expect(messages[1].content).toContain("张三");
  });

  it("parseInterviewScoreResult 应正确解析", () => {
    const mockResponse = JSON.stringify({
      score: 85,
      feedback: "优点：理解核心概念。不足：缺少细节",
      comparison: "用户答案覆盖了参考答案的 70%",
    });
    const result = parseInterviewScoreResult(mockResponse);
    expect(result.score).toBe(85);
    expect(result.feedback).toContain("优点");
    expect(result.comparison).toContain("70%");
  });

  it("parseInterviewScoreResult 应在 score 越界时抛错", () => {
    const mockResponse = JSON.stringify({
      score: 150,
      feedback: "test",
      comparison: "test",
    });
    expect(() => parseInterviewScoreResult(mockResponse)).toThrow();
  });

  it("parseInterviewScoreResult 应在 score 非数字时抛错", () => {
    const mockResponse = JSON.stringify({
      score: "abc",
      feedback: "test",
      comparison: "test",
    });
    expect(() => parseInterviewScoreResult(mockResponse)).toThrow();
  });

  it("parseInterviewScoreResult 应清理 markdown 代码块", () => {
    const mockResponse = "```json\n" + JSON.stringify({
      score: 75,
      feedback: "反馈",
      comparison: "对比",
    }) + "\n```";
    const result = parseInterviewScoreResult(mockResponse);
    expect(result.score).toBe(75);
  });
});
