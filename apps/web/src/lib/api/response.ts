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
// 互換エラー（現行envelope）
interface ErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// RFC 9457 Problem Details（拡張: code）
interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string; // 拡張メンバ
  // 互換目的で envelope を同梱（段階移行）
  success?: false;
  data?: null;
  error?: ErrorResponse['error'];
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

  // エラーレスポンス（段階移行: problem+json + 互換envelope同梱）
  static error(
    code: string,
    message: string,
    status: number = 400,
    details?: unknown
  ): NextResponse<ProblemDetails> {
    const body: ProblemDetails = {
      type: 'about:blank',
      title: message || code,
      status,
      detail: message,
      code,
      // 互換payload（当面維持）
      success: false,
      data: null,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    };
    return new NextResponse(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/problem+json; charset=utf-8' },
    });
  }

  // 一般的なエラーレスポンス
  static badRequest(
    message: string = 'Bad Request',
    details?: unknown
  ): NextResponse<ProblemDetails> {
    return this.error('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse<ProblemDetails> {
    return this.error('UNAUTHORIZED', message, 401);
  }

  static forbidden(message: string = 'Forbidden'): NextResponse<ProblemDetails> {
    return this.error('FORBIDDEN', message, 403);
  }

  static notFound(message: string = 'Not Found'): NextResponse<ProblemDetails> {
    return this.error('NOT_FOUND', message, 404);
  }

  static conflict(message: string = 'Conflict', details?: unknown): NextResponse<ProblemDetails> {
    return this.error('CONFLICT', message, 409, details);
  }

  static validationError(
    message: string = 'Validation Error',
    details?: unknown
  ): NextResponse<ProblemDetails> {
    return this.error('VALIDATION_ERROR', message, 422, details);
  }

  static internalError(
    message: string = 'Internal Server Error',
    details?: unknown
  ): NextResponse<ProblemDetails> {
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
