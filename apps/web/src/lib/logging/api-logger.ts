import { NextRequest } from 'next/server';
import { StructuredLogger, createRequestLogger } from './structured-logger';

/**
 * APIアクティビティログ
 */
export interface ApiActivityLog {
  requestId: string;
  timestamp: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * APIロガークラス
 */
export class ApiLogger {
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  /**
   * API呼び出しをログ
   */
  logApiCall(activity: ApiActivityLog): void {
    const level =
      activity.statusCode >= 500 ? 'error' : activity.statusCode >= 400 ? 'warn' : 'info';

    const message = `API ${activity.action} ${activity.resource}${
      activity.resourceId ? `/${activity.resourceId}` : ''
    } - ${activity.statusCode} ${activity.duration}ms`;

    const context: Record<string, unknown> = {
      requestId: activity.requestId,
      userId: activity.userId,
      action: activity.action,
      resource: activity.resource,
      resourceId: activity.resourceId,
      method: activity.method,
      path: activity.path,
      statusCode: activity.statusCode,
      duration: activity.duration,
      ...(activity.error && { error: activity.error }),
    };

    // 開発環境ではリクエスト/レスポンスボディも記録
    if (process.env.NODE_ENV === 'development') {
      if (activity.requestBody) {
        context['requestBody'] = this.sanitizeBody(activity.requestBody);
      }
      if (activity.responseBody) {
        context['responseBody'] = this.sanitizeBody(activity.responseBody);
      }
    }

    switch (level) {
      case 'error':
        this.logger.error(message, undefined, context);
        break;
      case 'warn':
        this.logger.warn(message, context);
        break;
      default:
        this.logger.info(message, context);
    }
  }

  /**
   * 認証イベントをログ
   */
  logAuthEvent(
    event: 'login' | 'logout' | 'signup' | 'password_reset',
    success: boolean,
    userId?: string,
    error?: string
  ): void {
    const message = `Auth event: ${event} - ${success ? 'success' : 'failed'}`;
    const context = {
      event,
      userId,
      success,
      ...(error && { error }),
    };

    if (success) {
      this.logger.info(message, context);
    } else {
      this.logger.warn(message, context);
    }
  }

  /**
   * セキュリティイベントをログ
   */
  logSecurityEvent(
    event: 'unauthorized_access' | 'forbidden_resource' | 'rate_limit_exceeded' | 'invalid_token',
    details: {
      userId?: string;
      resource?: string;
      ip?: string;
      userAgent?: string;
    }
  ): void {
    this.logger.warn(`Security event: ${event}`, {
      securityEvent: event,
      ...details,
    });
  }

  /**
   * データ変更をログ（監査ログ）
   */
  logDataChange(
    action: 'create' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    userId: string,
    changes?: {
      before?: unknown;
      after?: unknown;
    }
  ): void {
    const message = `Data ${action}: ${resource}/${resourceId}`;
    const context: Record<string, unknown> = {
      action,
      resource,
      resourceId,
      userId,
      timestamp: new Date().toISOString(),
    };

    // 開発環境では変更内容も記録
    if (process.env.NODE_ENV === 'development' && changes) {
      context['changes'] = {
        before: this.sanitizeBody(changes.before),
        after: this.sanitizeBody(changes.after),
      };
    }

    this.logger.info(message, context);
  }

  /**
   * ボディから機密情報を除去
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'credit_card'];
    const sanitized = { ...body } as Record<string, unknown>;

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * リクエストからAPIロガーを作成
 */
export function createApiLogger(request: NextRequest, requestId?: string): ApiLogger {
  const structuredLogger = createRequestLogger(request, requestId);
  return new ApiLogger(structuredLogger);
}

/**
 * APIロギングデコレーター
 */
export function withApiLogging<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  options: {
    action: string;
    resource: string;
    getResourceId?: (request: Request, context?: unknown) => string | undefined;
    getUserId?: (request: Request) => Promise<string | null>;
  }
): T {
  return (async (...args: unknown[]) => {
    const [request, context] = args as [Request, unknown];
    const startTime = Date.now();
    const apiLogger = createApiLogger(request as NextRequest);

    let response: Response;
    let responseBody: unknown;
    let error: { code: string; message: string } | undefined;

    try {
      // ハンドラーを実行
      response = await handler(...args);

      // レスポンスボディを取得
      if (response.status < 400) {
        const cloned = response.clone();
        responseBody = await cloned.json();
      }
    } catch (err) {
      // エラーレスポンスを作成
      error = {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
      response = new Response(JSON.stringify({ success: false, error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // アクティビティログを記録
    const duration = Date.now() - startTime;
    const userId = options.getUserId ? await options.getUserId(request) : undefined;
    const resourceId = options.getResourceId ? options.getResourceId(request, context) : undefined;

    const activity: ApiActivityLog = {
      requestId: request.headers.get('x-request-id') || 'unknown',
      timestamp: new Date().toISOString(),
      userId: userId || undefined,
      action: options.action,
      resource: options.resource,
      resourceId,
      method: request.method,
      path: new URL(request.url).pathname,
      statusCode: response.status,
      duration,
      responseBody,
      error,
    };

    // POSTリクエストの場合はボディも記録
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        const cloned = request.clone();
        activity.requestBody = await cloned.json();
      } catch {
        // ボディの解析に失敗した場合は無視
      }
    }

    apiLogger.logApiCall(activity);

    return response;
  }) as T;
}
