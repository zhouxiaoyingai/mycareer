/**
 * CloudBase 初始化脚本
 * 创建数据库集合 + 设置权限
 *
 * 使用方式：npx ts-node --project scripts/tsconfig.json scripts/init-cloudbase.ts
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config({ path: ".env.local" });

import CloudBase from "@cloudbase/manager-node";

const envId = process.env.CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.CLOUDBASE_SECRET_KEY;

if (!envId || !secretId || !secretKey) {
  console.error("❌ 缺少环境变量：CLOUDBASE_ENV_ID / CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY");
  console.error("请在 .env.local 中配置后重试");
  process.exit(1);
}

/** 需要创建的集合列表 */
const COLLECTIONS = [
  {
    name: "users",
    description: "用户表",
  },
  {
    name: "resumes",
    description: "简历表",
  },
  {
    name: "jds",
    description: "JD 职位描述表",
  },
  {
    name: "greetings",
    description: "打招呼话术表",
  },
  {
    name: "interviews",
    description: "面试表",
  },
  {
    name: "interview_sessions",
    description: "面试答题会话表",
  },
  {
    name: "applications",
    description: "投递记录表",
  },
];

async function main() {
  console.log(`\n🚀 开始初始化 CloudBase 环境: ${envId}\n`);

  const client = new CloudBase({
    envId,
    secretId,
    secretKey,
  });

  // 1. 获取现有集合列表
  console.log("📋 正在获取现有集合列表...");
  let existingCollections: string[] = [];
  const db = client.database as unknown as {
    listCollections: () => Promise<unknown>;
    createCollection: (name: string) => Promise<unknown>;
    updateCollection: (name: string, options: Record<string, unknown>) => Promise<unknown>;
  };
  try {
    const result = await db.listCollections();
    const list = (Array.isArray(result) ? result : (result as { collections?: unknown[] })?.collections ?? []) as { name?: string }[];
    existingCollections = list.map((c) => c?.name ?? "").filter(Boolean);
    console.log(`   现有集合: ${existingCollections.length} 个`);
  } catch (err) {
    console.warn("   ⚠️ 获取集合列表失败，将尝试直接创建:", err instanceof Error ? err.message : err);
  }

  // 2. 创建缺失的集合
  console.log("\n📦 开始创建集合...");
  let created = 0;
  let skipped = 0;

  for (const col of COLLECTIONS) {
    if (existingCollections.includes(col.name)) {
      console.log(`   ⏭️  集合 ${col.name} 已存在，跳过`);
      skipped++;
      continue;
    }

    try {
      await db.createCollection(col.name);
      console.log(`   ✅ 集合 ${col.name} 创建成功（${col.description}）`);
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("DATABASE_COLLECTION_EXISTS")) {
        console.log(`   ⏭️  集合 ${col.name} 已存在，跳过`);
        skipped++;
      } else {
        console.error(`   ❌ 集合 ${col.name} 创建失败:`, msg);
      }
    }
  }

  console.log(`\n📊 创建结果: 新建 ${created} 个, 跳过 ${skipped} 个`);

  // 3. 设置集合权限为「仅创建者可读写」
  console.log("\n🔒 正在设置集合权限...");
  for (const col of COLLECTIONS) {
    try {
      // 权限设置：0=只读，1=所有用户可读写，2=仅创建者可读写，3=仅管理端可读写
      await db.updateCollection(col.name, {
        acl: 2, // 仅创建者可读写
      });
      console.log(`   ✅ ${col.name} 权限已设置为「仅创建者可读写」`);
    } catch (err) {
      console.warn(
        `   ⚠️  ${col.name} 权限设置失败:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 4. 检查并开启匿名登录（可选）
  console.log("\n🔐 检查登录方式配置...");
  try {
    const envList = await client.env.listEnvs();
    const envArray = (envList as unknown as { EnvList?: { EnvId: string; Alias: string }[] })?.EnvList ?? [];
    const currentEnv = envArray.find((e) => e.EnvId === envId);
    if (currentEnv) {
      console.log(`   ✅ 环境信息: ${currentEnv.Alias || currentEnv.EnvId}`);
      console.log(`   ℹ️  请在控制台手动开启「邮箱密码登录」:`);
      console.log(`      https://console.cloud.tencent.com/tcb/env/login?envId=${envId}`);
    } else {
      console.log(`   ℹ️  请在控制台手动开启「邮箱密码登录」:`);
      console.log(`      https://console.cloud.tencent.com/tcb/env/login?envId=${envId}`);
    }
  } catch (err) {
    console.warn("   ⚠️ 获取环境信息失败:", err instanceof Error ? err.message : err);
    console.log(`   ℹ️  请在控制台手动开启「邮箱密码登录」:`);
    console.log(`      https://console.cloud.tencent.com/tcb/env/login?envId=${envId}`);
  }

  console.log("\n✨ CloudBase 初始化完成！\n");
  console.log("下一步：");
  console.log("  1. 在 CloudBase 控制台开启「邮箱密码登录」");
  console.log("  2. 运行 npm run dev 启动开发服务器");
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ 初始化失败:", err);
  process.exit(1);
});
