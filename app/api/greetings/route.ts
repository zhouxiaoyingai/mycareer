import { requireAuth } from "@/lib/cloudbase/auth";
import { listGreetingsByUser } from "@/lib/cloudbase/resumes";
import { getJdById } from "@/lib/cloudbase/jds";
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from "@/lib/utils/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();

    const greetings = await listGreetingsByUser(session.userId);

    // 批量查询关联 JD 标题
    const jdIds = [...new Set(greetings.map((g) => g.jdId).filter(Boolean))] as string[];
    const jdMap = new Map<string, string>();
    await Promise.all(
      jdIds.map(async (jdId) => {
        try {
          const jd = await getJdById(jdId, session.userId);
          if (jd) {
            jdMap.set(jdId, jd.targetRole || jd.structured?.title || "目标岗位");
          }
        } catch {
          // JD 可能已删除，忽略
        }
      }),
    );

    const result = greetings.map((g) => ({
      ...g,
      jdTitle: g.jdId ? jdMap.get(g.jdId) : undefined,
    }));

    return successResponse({ greetings: result });
  } catch (error) {
    console.error("获取打招呼话术列表失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `获取打招呼话术列表失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
