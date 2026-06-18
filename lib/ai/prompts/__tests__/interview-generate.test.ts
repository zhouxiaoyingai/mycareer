import {
  INTERVIEW_GENERATE_SYSTEM_PROMPT,
  buildInterviewGenerateMessages,
  parseInterviewGenerateResult,
} from "../interview-generate";
import type { JdStructured } from "@/types/jd";

describe("interview-generate 提示词", () => {
  it("系统提示词应包含防幻觉规则", () => {
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("防幻觉三维度规则");
  });

  it("系统提示词应包含 4 种题型说明", () => {
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("技术题");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("行为题");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("案例题");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("通用题");
  });

  it("系统提示词应包含题目数量要求", () => {
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("技术题 3");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("行为题 2");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("案例题 1");
    expect(INTERVIEW_GENERATE_SYSTEM_PROMPT).toContain("通用题 2");
  });

  it("buildInterviewGenerateMessages 应包含 JD 和简历内容", () => {
    const jdStructured: JdStructured = {
      title: "高级前端工程师",
      company: "字节跳动",
      employmentType: "全职",
      experienceLevel: "高级",
      hardSkills: [{ name: "React", weight: 5, context: "必须精通" }],
      softSkills: [{ name: "团队协作", weight: 4, context: "跨部门协作" }],
      industryTerms: [],
      responsibilities: ["负责前端架构"],
      requirements: ["5年前端经验"],
      niceToHave: [],
    };
    const messages = buildInterviewGenerateMessages({
      jdStructured,
      resumeZhContent: "张三，5年前端工程师，精通 React",
    });
    expect(messages[1].content).toContain("高级前端工程师");
    expect(messages[1].content).toContain("字节跳动");
    expect(messages[1].content).toContain("React");
    expect(messages[1].content).toContain("张三");
  });

  it("parseInterviewGenerateResult 应正确解析 8 题", () => {
    const mockResponse = JSON.stringify({
      questions: Array.from({ length: 8 }, (_, i) => ({
        id: `q${i + 1}`,
        type: i < 3 ? "technical" : i < 5 ? "behavioral" : i < 6 ? "case" : "general",
        question: `题${i + 1}`,
        referenceAnswer: `答${i + 1}`,
        answerStrategy: `思路${i + 1}`,
      })),
    });
    const result = parseInterviewGenerateResult(mockResponse);
    expect(result.questions).toHaveLength(8);
    expect(result.questions[0].id).toBe("q1");
    expect(result.questions[0].type).toBe("technical");
    expect(result.questions[6].type).toBe("general");
  });

  it("parseInterviewGenerateResult 应在题目数量不足时抛错", () => {
    const mockResponse = JSON.stringify({
      questions: [
        { id: "q1", type: "technical", question: "题1", referenceAnswer: "答1", answerStrategy: "思路1" },
      ],
    });
    expect(() => parseInterviewGenerateResult(mockResponse)).toThrow();
  });

  it("parseInterviewGenerateResult 应清理 markdown 代码块", () => {
    const mockResponse = "```json\n" + JSON.stringify({
      questions: Array.from({ length: 8 }, (_, i) => ({
        id: `q${i + 1}`,
        type: "technical",
        question: `题${i + 1}`,
        referenceAnswer: `答${i + 1}`,
        answerStrategy: `思路${i + 1}`,
      })),
    }) + "\n```";
    const result = parseInterviewGenerateResult(mockResponse);
    expect(result.questions).toHaveLength(8);
  });

  it("parseInterviewGenerateResult 应将 undefined/null 替换为空字符串", () => {
    const mockResponse = `{
      "questions": [
        ${Array.from({ length: 8 }, (_, i) => `{
          "id": "q${i + 1}",
          "type": "technical",
          "question": "题${i + 1}",
          "referenceAnswer": null,
          "answerStrategy": undefined
        }`).join(",")}
      ]
    }`;
    const result = parseInterviewGenerateResult(mockResponse);
    expect(result.questions[0].referenceAnswer).toBe("");
    expect(result.questions[0].answerStrategy).toBe("");
  });
});
