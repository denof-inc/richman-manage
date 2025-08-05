import { NextResponse } from 'next/server';

// 成功レスポンスの型定義
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  error: null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// エラーレスポンスの型定義
interface ErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// APIレスポンスのユーティリティクラス
export class ApiResponse {
  // 成功レスポンス
  static success<T = unknown>(
    data: T,
    meta?: SuccessResponse<T>['meta'],
    status: number = 200
  ): NextResponse<SuccessResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        error: null,
        ...(meta && { meta }),
      },
      { status }
    );
  }

  // エラーレスポンス
  static error(
    code: string,
    message: string,
    status: number = 400,
    details?: unknown
  ): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code,
          message,
          ...(details ? { details } : {}),
        },
      },
      { status }
    );
  }

  // 一般的なエラーレスポンス
  static badRequest(
    message: string = 'Bad Request',
    details?: unknown
  ): NextResponse<ErrorResponse> {
    return this.error('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse<ErrorResponse> {
    return this.error('UNAUTHORIZED', message, 401);
  }

  static forbidden(message: string = 'Forbidden'): NextResponse<ErrorResponse> {
    return this.error('FORBIDDEN', message, 403);
  }

  static notFound(message: string = 'Not Found'): NextResponse<ErrorResponse> {
    return this.error('NOT_FOUND', message, 404);
  }

  static conflict(message: string = 'Conflict', details?: unknown): NextResponse<ErrorResponse> {
    return this.error('CONFLICT', message, 409, details);
  }

  static validationError(
    message: string = 'Validation Error',
    details?: unknown
  ): NextResponse<ErrorResponse> {
    return this.error('VALIDATION_ERROR', message, 422, details);
  }

  static internalError(
    message: string = 'Internal Server Error',
    details?: unknown
  ): NextResponse<ErrorResponse> {
    console.error('Internal Server Error:', message, details);
    return this.error('INTERNAL_ERROR', message, 500, details);
  }

  // ページネーション付きレスポンス
  static paginated<T = unknown>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): NextResponse<SuccessResponse<T[]>> {
    const totalPages = Math.ceil(total / limit);
    return this.success(data, {
      page,
      limit,
      total,
      totalPages,
    });
  }
}
