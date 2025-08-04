import { NextResponse } from 'next/server';

// 成功レスポンスの型定義
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SuccessResponse<T = any> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
  };
}

// APIレスポンスのユーティリティクラス
export class ApiResponse {
  // 成功レスポンス
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static success<T = any>(
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any
  ): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code,
          message,
          ...(details && { details }),
        },
      },
      { status }
    );
  }

  // 一般的なエラーレスポンス
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static badRequest(message: string = 'Bad Request', details?: any): NextResponse<ErrorResponse> {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static conflict(message: string = 'Conflict', details?: any): NextResponse<ErrorResponse> {
    return this.error('CONFLICT', message, 409, details);
  }

  static validationError(
    message: string = 'Validation Error',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any
  ): NextResponse<ErrorResponse> {
    return this.error('VALIDATION_ERROR', message, 422, details);
  }

  static internalError(
    message: string = 'Internal Server Error',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any
  ): NextResponse<ErrorResponse> {
    console.error('Internal Server Error:', message, details);
    return this.error('INTERNAL_ERROR', message, 500, details);
  }

  // ページネーション付きレスポンス
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static paginated<T = any>(
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
