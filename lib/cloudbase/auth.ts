import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findOne, Collections } from "./db";
import type { User, UserSession } from "@/types/user";

const SESSION_COOKIE = "mycareer_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 天
const BCRYPT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 环境变量未设置");
  }
  return secret;
}

/** 注册用户：邮箱 + 密码（bcrypt 哈希存储） */
export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  // 检查邮箱是否已注册
  const existing = await findOne<User>(Collections.USERS, { email });
  if (existing) {
    throw new Error("该邮箱已注册");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date();

  // 使用 email 作为 _id 的一部分，确保唯一
  // CloudBase 会自动生成 _id，这里我们用自定义格式
  const userDoc = {
    email,
    passwordHash,
    displayName,
    preferredLang: "zh" as const,
    createdAt: now,
    updatedAt: now,
  };

  const db = (await import("./client")).getDb();
  const result = await db.collection(Collections.USERS).add(userDoc);
  const userId = result.id || result._id;

  if (!userId) {
    throw new Error("注册失败：未能创建用户记录");
  }

  return {
    _id: userId,
    ...userDoc,
  } as User;
}

/** 登录用户：校验密码，返回 JWT token */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const user = await findOne<User>(Collections.USERS, { email });
  if (!user) {
    throw new Error("邮箱或密码错误");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error("邮箱或密码错误");
  }

  // 生成 JWT token
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: SESSION_MAX_AGE }
  );

  return { user, token };
}

/** 设置 session cookie */
export async function setSession(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/** 清除 session cookie */
export function clearSession(): void {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** 获取 session token */
export function getSessionToken(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

/** 获取当前登录用户 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const token = getSessionToken();
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      email: string;
    };

    const user = await findOne<User>(Collections.USERS, { _id: decoded.userId });
    if (!user) {
      return null;
    }

    return {
      userId: user._id,
      email: user.email,
      displayName: user.displayName,
      preferredLang: user.preferredLang,
    };
  } catch {
    return null;
  }
}

/** 要求登录，否则抛出 UNAUTHORIZED */
export async function requireAuth(): Promise<UserSession> {
  const session = await getCurrentUser();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
