import { NextResponse } from "next/server";

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  userStory?: string;
};

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
  userStory?: string;
};

export function jsonSuccess<T>(
  data: T,
  options?: { status?: number; userStory?: string },
) {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    ...(options?.userStory ? { userStory: options.userStory } : {}),
  };
  return NextResponse.json(body, { status: options?.status ?? 200 });
}

export function jsonError(
  code: string,
  message: string,
  options?: { status?: number; details?: unknown; userStory?: string },
) {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code,
      message,
      ...(options?.details !== undefined ? { details: options.details } : {}),
    },
    ...(options?.userStory ? { userStory: options.userStory } : {}),
  };
  return NextResponse.json(body, { status: options?.status ?? 400 });
}
