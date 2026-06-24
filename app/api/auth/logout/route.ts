import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/response";

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return errorResponse("INTERNAL_ERROR", "登出失败: " + error.message, 500);
    }
    return successResponse({ success: true });
  } catch (error) {
    console.error("登出失败:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "登出失败: " + (error instanceof Error ? error.message : String(error)),
      500
    );
  }
}
