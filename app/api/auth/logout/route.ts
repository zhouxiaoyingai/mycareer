import { clearSession } from "@/lib/cloudbase/auth";
import { successResponse } from "@/lib/utils/response";

export async function POST() {
  clearSession();
  return successResponse({ success: true });
}
