import { NextResponse } from "next/server";
import type { ApiSuccessResponse, ApiErrorResponse, ErrorCode } from "@/types/api";

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function unauthorizedResponse(message = "未登录或登录已过期"): NextResponse<ApiErrorResponse> {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function validationErrorResponse(message: string, details?: Record<string, unknown>): NextResponse<ApiErrorResponse> {
  return errorResponse("VALIDATION_ERROR", message, 422, details);
}

export function internalErrorResponse(message = "服务器内部错误"): NextResponse<ApiErrorResponse> {
  return errorResponse("INTERNAL_ERROR", message, 500);
}
