import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "mycareer_session";
const PUBLIC_ROUTES = ["/login", "/register"];

// Edge Runtime 兼容的 JWT 校验（仅检查签名和过期，不查数据库）
async function isTokenValid(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // 有 token 时验证有效性
  const tokenValid = token ? await isTokenValid(token) : false;

  // token 无效但存在 → 清除 cookie，避免重定向循环
  if (token && !tokenValid) {
    const res = isPublicRoute
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // token 有效且访问公开路由 → 跳转 dashboard
  if (tokenValid && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 无 token 且访问受保护路由 → 跳转登录
  if (!tokenValid && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
