/**
 * 临时脚本：将已有的 standard 类型简历状态从 draft 更新为 completed
 * 运行：npx ts-node scripts/fix-resume-status.ts
 */
import { getDb } from "../lib/cloudbase/client";
import { Collections } from "../lib/cloudbase/db";

async function main() {
  const db = getDb();
  const res = await db
    .collection(Collections.RESUMES)
    .where({ type: "standard", status: "draft" })
    .update({ status: "completed", updatedAt: new Date() });
  console.log(`已更新 ${res.updated} 条简历状态: draft → completed`);
}

main().catch(console.error);
