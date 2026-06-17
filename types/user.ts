/**
 * 用户相关类型定义
 */

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  preferredLang: "zh" | "en";
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  userId: string;
  email: string;
  displayName: string;
  preferredLang: "zh" | "en";
}
