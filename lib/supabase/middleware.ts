import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Next.js Middleware 用于 Supabase session 自动刷新
 * 路径：/middleware.ts
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(
            ({ name, value, options }: CookieToSet) =>
              response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 重要：必须调用 getUser() 才能触发 token 刷新
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保护路由：未登录访问受保护页面跳转 /login
  const protectedPaths = [
    "/dashboard",
    "/resume",
    "/jd",
    "/interview",
    "/discover",
    "/greeting",
  ];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
