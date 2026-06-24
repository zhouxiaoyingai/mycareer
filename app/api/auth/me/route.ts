import { getCurrentUser } from "@/lib/supabase/auth";
import { successResponse, unauthorizedResponse } from "@/lib/utils/response";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return unauthorizedResponse();
  }
  return successResponse({ user: session });
}
