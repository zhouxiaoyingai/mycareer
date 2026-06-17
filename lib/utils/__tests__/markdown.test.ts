import {
  detectPlaceholders,
  countPlaceholders,
  highlightPlaceholders,
  cleanMarkdown,
  extractSections,
  countWords,
  estimatePages,
  markdownToPlainText,
} from "../markdown";

describe("detectPlaceholders", () => {
  it("应检测 ____% 占位符", () => {
    const result = detectPlaceholders("性能提升 ____%");
    expect(result).toContain("____%");
  });

  it("应检测 [待填写] 占位符", () => {
    const result = detectPlaceholders("电话：[电话待填写]");
    expect(result).toContain("[电话待填写]");
  });

  it("应检测 [缺失] 占位符", () => {
    const result = detectPlaceholders("项目：[缺失]");
    expect(result).toContain("[缺失]");
  });

  it("无占位符应返回空数组", () => {
    const result = detectPlaceholders("正常文本");
    expect(result).toEqual([]);
  });

  it("应去重", () => {
    const result = detectPlaceholders("____% 和 ____%");
    expect(result).toEqual(["____%"]);
  });
});

describe("countPlaceholders", () => {
  it("应统计所有占位符数量", () => {
    expect(countPlaceholders("____% 和 [待填写]")).toBe(2);
  });

  it("应统计重复占位符", () => {
    expect(countPlaceholders("____% 和 ____%")).toBe(2);
  });
});

describe("highlightPlaceholders", () => {
  it("应将占位符包裹在 mark 标签中", () => {
    const result = highlightPlaceholders("提升 ____%");
    expect(result).toContain('<mark class="placeholder">____%</mark>');
  });

  it("不应修改无占位符的文本", () => {
    const result = highlightPlaceholders("正常文本");
    expect(result).toBe("正常文本");
  });
});

describe("cleanMarkdown", () => {
  it("应统一换行符", () => {
    expect(cleanMarkdown("a\r\nb")).toBe("a\nb");
  });

  it("应压缩多余空行", () => {
    expect(cleanMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("应去除行尾空格", () => {
    expect(cleanMarkdown("a   \nb")).toBe("a\nb");
  });

  it("应去除首尾空白", () => {
    expect(cleanMarkdown("  \n内容\n  ")).toBe("内容");
  });
});

describe("extractSections", () => {
  const sampleMarkdown = `
## 联系方式
张三 | zhangsan@test.com

## 个人简介
5 年前端经验

## 工作经历
### 测试公司 - 前端工程师
- 负责前端开发

## 项目经历
### 项目 A
- 项目描述

## 教育经历
### 某大学
- 计算机科学

## 技能
React, Node.js
`;

  it("应提取联系方式", () => {
    const sections = extractSections(sampleMarkdown);
    expect(sections.contact).toContain("张三");
  });

  it("应提取个人简介", () => {
    const sections = extractSections(sampleMarkdown);
    expect(sections.summary).toContain("5 年前端经验");
  });

  it("应提取工作经历", () => {
    const sections = extractSections(sampleMarkdown);
    expect(sections.experiences).toContain("测试公司");
  });

  it("应提取项目经历", () => {
    const sections = extractSections(sampleMarkdown);
    expect(sections.projects).toContain("项目 A");
  });

  it("应提取教育经历", () => {
    const sections = extractSections(sampleMarkdown);
    expect(sections.education).toContain("某大学");
  });

  it("应提取技能", () => {
    const sections = extractSections(sampleMarkdown);
    expect(sections.skills).toContain("React");
  });
});

describe("countWords", () => {
  it("应统计中文字数", () => {
    const result = countWords("这是中文测试");
    expect(result.zh).toBe(6);
  });

  it("应统计英文词数", () => {
    const result = countWords("hello world");
    expect(result.en).toBe(2);
  });

  it("应统计中英混合", () => {
    const result = countWords("这是 hello 中文 world");
    expect(result.zh).toBe(4);
    expect(result.en).toBe(2);
    expect(result.total).toBe(6);
  });
});

describe("estimatePages", () => {
  it("短文本应为 1 页", () => {
    expect(estimatePages("短文本")).toBe(1);
  });

  it("中等长度应为 2 页", () => {
    const text = "字".repeat(1000);
    expect(estimatePages(text)).toBe(2);
  });

  it("长文本应超过 2 页", () => {
    const text = "字".repeat(2000);
    expect(estimatePages(text)).toBeGreaterThan(2);
  });
});

describe("markdownToPlainText", () => {
  it("应去除标题标记", () => {
    expect(markdownToPlainText("## 标题")).toBe("标题");
  });

  it("应去除加粗标记", () => {
    expect(markdownToPlainText("**加粗**")).toBe("加粗");
  });

  it("应去除斜体标记", () => {
    expect(markdownToPlainText("*斜体*")).toBe("斜体");
  });

  it("应去除代码标记", () => {
    expect(markdownToPlainText("`代码`")).toBe("代码");
  });

  it("应转换链接为文本", () => {
    expect(markdownToPlainText("[链接](https://example.com)")).toBe("链接");
  });

  it("应统一列表标记", () => {
    expect(markdownToPlainText("* 项目")).toBe("- 项目");
  });
});
