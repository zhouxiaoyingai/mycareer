import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/auth";
import { getResumeById, updateResume } from "@/lib/supabase/db/resumes";
import { isConfirmCompleted } from "@/lib/ai/prompts/shared/confirmable-items";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  internalErrorResponse,
  errorResponse,
} from "@/lib/utils/response";
import type { ConfirmableItem } from "@/types/jd";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["accepted", "rejected", "modified"]),
      userModifiedText: z.string().optional(),
    }),
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse("输入校验失败", parsed.error.flatten());
    }

    const resume = await getResumeById(params.id, session.userId);
    if (!resume) {
      return errorResponse("NOT_FOUND", "简历不存在或无权访问", 404);
    }
    if (resume.type !== "tailored") {
      return validationErrorResponse("仅定制版简历支持待确认项处理");
    }
    if (!resume.confirmable_items || resume.confirmable_items.length === 0) {
      return validationErrorResponse("该简历无待确认项");
    }

    const userConfirmations = new Map(
      parsed.data.items.map((item) => [item.id, item]),
    );
    const updatedItems: ConfirmableItem[] = resume.confirmable_items.map(
      (item) => {
        const userResp = userConfirmations.get(item.id);
        if (!userResp) return item;
        return {
          ...item,
          status: userResp.status,
          userModifiedText: userResp.userModifiedText,
        };
      },
    );

    const confirmCompleted = isConfirmCompleted(updatedItems);
    await updateResume(params.id, session.userId, {
      confirmable_items: updatedItems,
      confirm_completed: confirmCompleted,
      status: "completed",
    });

    return successResponse({
      resumeId: params.id,
      confirmable_items: updatedItems,
      confirmCompleted,
    });
  } catch (error) {
    console.error("处理待确认项失败:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    return internalErrorResponse(
      `处理待确认项失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
