import cloudbase, { CloudBase } from "@cloudbase/node-sdk";

let app: CloudBase | null = null;

export function getCloudBaseApp(): CloudBase {
  if (app) {
    return app;
  }

  const envId = process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.CLOUDBASE_SECRET_KEY;

  if (!envId) {
    throw new Error("CLOUDBASE_ENV_ID 环境变量未设置");
  }
  if (!secretId || !secretKey) {
    throw new Error("CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY 环境变量未设置");
  }

  app = cloudbase.init({
    env: envId,
    secretId,
    secretKey,
  });

  return app;
}

// 使用 ReturnType 获取 SDK 真实的 database() 返回类型
export function getDb(): ReturnType<CloudBase["database"]> {
  return getCloudBaseApp().database();
}
