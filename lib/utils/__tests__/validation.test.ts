import { registerSchema, loginSchema } from "../validation";

describe("registerSchema", () => {
  it("应接受有效的注册输入", () => {
    const valid = {
      email: "test@example.com",
      password: "12345678",
      displayName: "测试用户",
    };
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("应拒绝无效邮箱", () => {
    const invalid = {
      email: "not-an-email",
      password: "12345678",
      displayName: "测试",
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("应拒绝短密码（少于8位）", () => {
    const invalid = {
      email: "test@example.com",
      password: "1234567",
      displayName: "测试",
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("应拒绝空昵称", () => {
    const invalid = {
      email: "test@example.com",
      password: "12345678",
      displayName: "",
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("应接受有效的登录输入", () => {
    const valid = {
      email: "test@example.com",
      password: "anypassword",
    };
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("应拒绝无效邮箱", () => {
    const invalid = {
      email: "not-an-email",
      password: "123456",
    };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("应拒绝空密码", () => {
    const invalid = {
      email: "test@example.com",
      password: "",
    };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
