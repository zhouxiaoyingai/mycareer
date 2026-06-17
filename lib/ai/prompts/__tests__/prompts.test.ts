import {
  RESUME_PARSE_SYSTEM_PROMPT,
  buildResumeParseMessages,
  buildResumeParseUserMessage,
} from "../resume-parse";
import {
  RESUME_GENERATE_SYSTEM_PROMPT,
  buildResumeGenerateMessages,
  parseResumeGenerateResult,
} from "../resume-generate";
import {
  RESUME_TAILOR_SYSTEM_PROMPT,
  buildResumeTailorMessages,
  parseResumeTailorResult,
} from "../resume-tailor";
import {
  JD_PARSE_SYSTEM_PROMPT,
  buildJdParseMessages,
  parseJdParseResult,
} from "../jd-parse";

describe("resume-parse 提示词", () => {
  it("系统提示词应包含防幻觉规则", () => {
    expect(RESUME_PARSE_SYSTEM_PROMPT).toContain("防幻觉三维度规则");
    expect(RESUME_PARSE_SYSTEM_PROMPT).toContain("不编造事实");
  });

  it("系统提示词应包含 JSON 输出格式", () => {
    expect(RESUME_PARSE_SYSTEM_PROMPT).toContain('"structured"');
    expect(RESUME_PARSE_SYSTEM_PROMPT).toContain('"contact"');
    expect(RESUME_PARSE_SYSTEM_PROMPT).toContain('"experiences"');
  });

  it("用户消息应包含原文和来源标签", () => {
    const msg = buildResumeParseUserMessage({
      rawContent: "张三，前端工程师",
      sourceType: "paste",
    });
    expect(msg).toContain("张三，前端工程师");
    expect(msg).toContain("粘贴文本");
  });

  it("应支持 hint 提示", () => {
    const msg = buildResumeParseUserMessage({
      rawContent: "简历内容",
      sourceType: "upload_pdf",
      hint: "这是 5 年前的简历",
    });
    expect(msg).toContain("这是 5 年前的简历");
  });

  it("buildResumeParseMessages 应返回 system + user 消息", () => {
    const messages = buildResumeParseMessages({
      rawContent: "test",
      sourceType: "paste",
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });
});

describe("resume-generate 提示词", () => {
  const mockStructured = {
    contact: { name: "张三", email: "zhangsan@test.com" },
    experiences: [
      {
        id: "exp_0",
        company: "测试公司",
        title: "前端工程师",
        startDate: "2020-01",
        endDate: "2023-01",
        bullets: ["负责前端开发"],
      },
    ],
    projects: [],
    education: [],
    skills: { technical: [], languages: [], tools: [], certifications: [] },
  };

  it("系统提示词应包含 STAR 原则", () => {
    expect(RESUME_GENERATE_SYSTEM_PROMPT).toContain("STAR");
    expect(RESUME_GENERATE_SYSTEM_PROMPT).toContain("Situation");
    expect(RESUME_GENERATE_SYSTEM_PROMPT).toContain("Result");
  });

  it("系统提示词应包含中英双版独立重写规则", () => {
    expect(RESUME_GENERATE_SYSTEM_PROMPT).toContain("中英双版独立重写");
    expect(RESUME_GENERATE_SYSTEM_PROMPT).toContain("非翻译");
  });

  it("用户消息应包含选项和结构化数据", () => {
    const msg = buildResumeGenerateMessages({
      structured: mockStructured,
      options: {
        templateStyle: "star",
        length: "1page",
        language: "both",
      },
    });
    expect(msg[1].content).toContain("STAR 原则强化");
    expect(msg[1].content).toContain("1 页");
    expect(msg[1].content).toContain("中英双版");
    expect(msg[1].content).toContain("张三");
  });

  it("parseResumeGenerateResult 应正确解析 JSON", () => {
    const raw = JSON.stringify({
      content: { zh: "中文简历", en: "English resume" },
      provenance: [
        {
          field: "exp[0]",
          fromOriginal: "原文",
          rewriteAction: "verb_upgrade",
          hallucinationRisk: "medium",
        },
      ],
      aiFlavorScore: 2,
    });
    const result = parseResumeGenerateResult(raw);
    expect(result.content.zh).toBe("中文简历");
    expect(result.content.en).toBe("English resume");
    expect(result.provenance).toHaveLength(1);
    expect(result.aiFlavorScore).toBe(2);
  });

  it("parseResumeGenerateResult 应处理 markdown 代码块包裹", () => {
    const raw = "```json\n" + JSON.stringify({
      content: { zh: "zh", en: "en" },
      provenance: [],
      aiFlavorScore: 0,
    }) + "\n```";
    const result = parseResumeGenerateResult(raw);
    expect(result.content.zh).toBe("zh");
  });

  it("parseResumeGenerateResult 应在解析失败时抛错", () => {
    expect(() => parseResumeGenerateResult("not json")).toThrow();
  });
});

describe("resume-tailor 提示词", () => {
  it("系统提示词应包含匹配度分析", () => {
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("matchScore");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("matchDetails");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("gapAnalysis");
  });

  it("用户消息应包含 JD 和简历内容", () => {
    const messages = buildResumeTailorMessages({
      standardContent: { zh: "中文简历", en: "English resume" },
      structured: {
        contact: { name: "张三" },
        experiences: [],
        projects: [],
        education: [],
        skills: { technical: [], languages: [], tools: [], certifications: [] },
      },
      jdText: "招聘 React 工程师",
      targetRole: "前端工程师",
    });
    expect(messages[1].content).toContain("中文简历");
    expect(messages[1].content).toContain("English resume");
    expect(messages[1].content).toContain("招聘 React 工程师");
    expect(messages[1].content).toContain("前端工程师");
  });

  it("parseResumeTailorResult 应正确解析", () => {
    const raw = JSON.stringify({
      content: { zh: "zh", en: "en" },
      provenance: [],
      matchAnalysis: {
        matchScore: 75,
        matchDetails: [
          { skill: "React", status: "matched", weight: 5, evidence: "3 年经验" },
        ],
        gapAnalysis: "缺失 K8s",
      },
      aiFlavorScore: 1,
    });
    const result = parseResumeTailorResult(raw);
    expect(result.matchAnalysis.matchScore).toBe(75);
    expect(result.matchAnalysis.matchDetails).toHaveLength(1);
    expect(result.matchAnalysis.gapAnalysis).toBe("缺失 K8s");
  });
});

describe("jd-parse 提示词", () => {
  it("系统提示词应包含权重判定规则", () => {
    expect(JD_PARSE_SYSTEM_PROMPT).toContain("权重");
    expect(JD_PARSE_SYSTEM_PROMPT).toContain("5: 明确要求且为核心");
  });

  it("用户消息应包含 JD 原文", () => {
    const messages = buildJdParseMessages({
      jdText: "招聘高级前端工程师，精通 React",
      targetRole: "前端工程师",
    });
    expect(messages[1].content).toContain("招聘高级前端工程师");
    expect(messages[1].content).toContain("前端工程师");
  });

  it("parseJdParseResult 应正确解析", () => {
    const raw = JSON.stringify({
      title: "前端工程师",
      company: "测试公司",
      location: "北京",
      employmentType: "全职",
      experienceLevel: "高级",
      hardSkills: [{ name: "React", weight: 5, context: "精通" }],
      softSkills: [{ name: "协作", weight: 4, context: "跨部门" }],
      industryTerms: [],
      responsibilities: ["负责前端"],
      requirements: ["3 年经验"],
      niceToHave: [],
    });
    const result = parseJdParseResult(raw);
    expect(result.title).toBe("前端工程师");
    expect(result.hardSkills[0].name).toBe("React");
    expect(result.hardSkills[0].weight).toBe(5);
  });

  it("parseJdParseResult 应处理缺失字段", () => {
    const raw = JSON.stringify({ title: "测试" });
    const result = parseJdParseResult(raw);
    expect(result.title).toBe("测试");
    expect(result.hardSkills).toEqual([]);
    expect(result.employmentType).toBe("全职");
  });
});

describe("resume-tailor 提示词（含待确认项）", () => {
  it("系统提示词应包含待确认项机制说明", () => {
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("待确认项");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("confirmableItems");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("inference");
    expect(RESUME_TAILOR_SYSTEM_PROMPT).toContain("placeholder");
  });

  it("parseResumeTailorResult 应解析 confirmableItems 字段", () => {
    const mockResponse = JSON.stringify({
      content: { zh: "中文简历", en: "English resume" },
      provenance: [],
      matchAnalysis: { matchScore: 80, matchDetails: [], gapAnalysis: "无差距" },
      aiFlavorScore: 0,
      confirmableItems: [{
        field: "experiences[0].bullets[0]",
        type: "inference",
        originalText: "参与了项目",
        inferredText: "主导了项目",
        question: "是否升级动词？",
        options: ["接受推断", "保留原文", "自定义"],
      }],
    });
    const result = parseResumeTailorResult(mockResponse);
    expect(result.confirmableItems).toHaveLength(1);
    expect(result.confirmableItems[0].type).toBe("inference");
    expect(result.confirmableItems[0].status).toBe("pending");
  });

  it("parseResumeTailorResult 应在缺少 confirmableItems 时返回空数组", () => {
    const mockResponse = JSON.stringify({
      content: { zh: "中文", en: "English" },
      provenance: [],
      matchAnalysis: { matchScore: 70, matchDetails: [], gapAnalysis: "" },
      aiFlavorScore: 0,
    });
    const result = parseResumeTailorResult(mockResponse);
    expect(result.confirmableItems).toEqual([]);
  });
});
