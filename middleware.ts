import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: any) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 排除静态资源和图片
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
