// lib/supabase/db/__tests__/strength.test.ts
import {
  createStrengthReport,
  getStrengthReportById,
  listStrengthReportsByUser,
  updateStrengthReport,
  deleteStrengthReport,
} from "../strength";
import { createClient } from "../../server";

// Mock Supabase server client
jest.mock("../../server", () => ({
  createClient: jest.fn(),
}));

const mockSingleQuery = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

const mockListQuery = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return chain;
};

describe("strength db operations", () => {
  const mockSupabase = { from: jest.fn() };
  const sampleAnswers = {
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
    valueRanking: ["growth", "help", "impact", "income", "balance", "challenge"],
    riskTolerance: "medium",
    yearsOfExperience: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("createStrengthReport inserts a row", async () => {
    const row = {
      id: "r1",
      user_id: "u1",
      answers: sampleAnswers,
      report: null,
      status: "in_progress",
    };
    mockSupabase.from.mockReturnValue(mockSingleQuery({ data: row, error: null }));
    const result = await createStrengthReport({ userId: "u1", answers: sampleAnswers });
    expect(result.id).toBe("r1");
    expect(mockSupabase.from).toHaveBeenCalledWith("strength_reports");
  });

  it("getStrengthReportById returns row when exists", async () => {
    const row = { id: "r1", user_id: "u1" };
    mockSupabase.from.mockReturnValue(mockSingleQuery({ data: row, error: null }));
    const result = await getStrengthReportById("u1", "r1");
    expect(result?.id).toBe("r1");
  });

  it("getStrengthReportById returns null on error", async () => {
    mockSupabase.from.mockReturnValue(
      mockSingleQuery({ data: null, error: { message: "not found" } })
    );
    const result = await getStrengthReportById("u1", "r1");
    expect(result).toBeNull();
  });

  it("listStrengthReportsByUser returns array", async () => {
    mockSupabase.from.mockReturnValue(
      mockListQuery({ data: [{ id: "r1" }], error: null })
    );
    const result = await listStrengthReportsByUser("u1");
    expect(result).toHaveLength(1);
  });

  it("updateStrengthReport updates fields", async () => {
    const updated = { id: "r1", status: "completed" };
    mockSupabase.from.mockReturnValue(
      mockSingleQuery({ data: updated, error: null })
    );
    const result = await updateStrengthReport("u1", "r1", {
      status: "completed",
    });
    expect(result.status).toBe("completed");
  });

  it("deleteStrengthReport completes without error", async () => {
    const deleteChain: any = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    deleteChain.then = (resolve: any) =>
      Promise.resolve({ error: null }).then(resolve);
    mockSupabase.from.mockReturnValue(deleteChain);
    await expect(deleteStrengthReport("u1", "r1")).resolves.toBeUndefined();
  });
});
