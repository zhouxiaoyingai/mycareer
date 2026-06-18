/**
 * 临时脚本：将已有的 standard 类型简历状态从 draft 更新为 completed
 * 运行：node scripts/fix-resume-status.js
 * 需在 .env.local 中配置 CLOUDBASE_ENV_ID / CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY
 */
const cloud = require("@cloudbase/node-sdk");

async function main() {
  const app = cloud.init({
    env: process.env.CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  const db = app.database();
  const res = await db
    .collection("resumes")
    .where({ type: "standard", status: "draft" })
    .update({ status: "completed", updatedAt: new Date() });
  console.log(`已更新 ${res.updated} 条简历状态: draft → completed`);
}

require("dotenv").config({ path: ".env.local" });
main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
