import { createJd, getJdById, listJdsByUser, updateJd, deleteJd } from "../jds";
import type { JdStructured } from "@/types/jd";

jest.mock("../db", () => ({
  Collections: { JDS: "jds", RESUMES: "resumes", USERS: "users" },
  insertOne: jest.fn(),
  findOne: jest.fn(),
  findMany: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
}));

const mockStructured: JdStructured = {
  title: "前端工程师",
  company: "测试公司",
  location: "北京",
  employmentType: "全职",
  experienceLevel: "中级",
  hardSkills: [{ name: "React", weight: 5, context: "必须精通" }],
  softSkills: [],
  industryTerms: [],
  responsibilities: ["负责前端开发"],
  requirements: ["3 年经验"],
  niceToHave: [],
};

describe("JD 数据访问层", () => {
  beforeEach(() => jest.clearAllMocks());

  it("createJd 应调用 insertOne 并返回完整 Jd 对象", async () => {
    const { insertOne } = require("../db");
    insertOne.mockResolvedValue("jd_id_123");
    const result = await createJd({
      userId: "user_1",
      rawText: "JD 原文",
      structured: mockStructured,
      targetRole: "前端",
    });
    expect(insertOne).toHaveBeenCalledWith("jds", expect.objectContaining({
      userId: "user_1",
      rawText: "JD 原文",
      structured: mockStructured,
      targetRole: "前端",
      status: "draft",
    }));
    expect(result._id).toBe("jd_id_123");
  });

  it("getJdById 应返回属于该用户的 JD", async () => {
    const { findOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "user_1", rawText: "text",
      structured: mockStructured, status: "parsed",
      createdAt: new Date(), updatedAt: new Date(),
    });
    const result = await getJdById("jd_1", "user_1");
    expect(result?._id).toBe("jd_1");
  });

  it("getJdById 应拒绝其他用户的 JD", async () => {
    const { findOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "other_user", rawText: "text",
      structured: mockStructured, status: "parsed",
      createdAt: new Date(), updatedAt: new Date(),
    });
    const result = await getJdById("jd_1", "user_1");
    expect(result).toBeNull();
  });

  it("listJdsByUser 应返回列表项含 structuredTitle", async () => {
    const { findMany } = require("../db");
    findMany.mockResolvedValue([{
      _id: "jd_1", userId: "user_1", status: "parsed",
      structured: mockStructured, targetRole: "前端",
      createdAt: new Date(), updatedAt: new Date(),
    }]);
    const result = await listJdsByUser("user_1");
    expect(result).toHaveLength(1);
    expect(result[0].structuredTitle).toBe("前端工程师");
    expect(result[0].structuredCompany).toBe("测试公司");
  });

  it("updateJd 应校验所有权后更新", async () => {
    const { findOne, updateOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "user_1", rawText: "old",
      structured: mockStructured, status: "draft",
      createdAt: new Date(), updatedAt: new Date(),
    });
    await updateJd("jd_1", "user_1", { status: "parsed" });
    expect(updateOne).toHaveBeenCalledWith("jds", "jd_1", { status: "parsed" });
  });

  it("updateJd 应拒绝不存在的 JD", async () => {
    const { findOne } = require("../db");
    findOne.mockResolvedValue(null);
    await expect(updateJd("jd_1", "user_1", { status: "parsed" }))
      .rejects.toThrow("JD 不存在或无权访问");
  });

  it("deleteJd 应校验所有权后删除", async () => {
    const { findOne, deleteOne } = require("../db");
    findOne.mockResolvedValue({
      _id: "jd_1", userId: "user_1", rawText: "text",
      structured: mockStructured, status: "parsed",
      createdAt: new Date(), updatedAt: new Date(),
    });
    await deleteJd("jd_1", "user_1");
    expect(deleteOne).toHaveBeenCalledWith("jds", "jd_1");
  });
});
