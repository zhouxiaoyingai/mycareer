import { buildResumePath } from "@/lib/supabase/storage";

describe("buildResumePath", () => {
  it("builds user-scoped path with timestamp", () => {
    const path = buildResumePath("user-123", "resume.pdf");
    expect(path).toMatch(/^user-123\/\d+_resume\.pdf$/);
  });

  it("sanitizes unsafe characters in filename", () => {
    const path = buildResumePath("user-123", "我的 简历 (final).pdf");
    expect(path).toMatch(/^user-123\/\d+_.*\.pdf$/);
    // 不应包含空格、括号、中文
    expect(path).not.toMatch(/[ ()中文]/);
  });

  it("preserves allowed special characters", () => {
    const path = buildResumePath("user-123", "resume-v1.2_final.pdf");
    expect(path).toMatch(/_resume-v1\.2_final\.pdf$/);
  });
});
