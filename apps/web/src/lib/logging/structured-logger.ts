import { NextRequest } from 'next/server';

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * ログコンテキスト
 */
export interface LogContext {
  requestId: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

/**
 * ログエントリー
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * 構造化ログクラス
 */
export class StructuredLogger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = { requestId: generateRequestId() }) {
    this.context = context;
    this.minLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
  }

  /**
   * ログレベルをパース
   */
  private parseLogLevel(level: string): LogLevel {
    const levels = Object.values(LogLevel);
    return levels.includes(level as LogLevel) ? (level as LogLevel) : LogLevel.INFO;
  }

  /**
   * ログレベルの優先度を取得
   */
  private getLogLevelPriority(level: LogLevel): number {
    const priorities = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.FATAL]: 4,
    };
    return priorities[level];
  }

  /**
   * ログを出力すべきか判定
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLogLevelPriority(level) >= this.getLogLevelPriority(this.minLevel);
  }

  /**
   * ログエントリーを作成
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    additionalContext?: Partial<LogContext>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.context,
        ...additionalContext,
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * ログを出力
   */
  private log(entry: LogEntry): void {
    if (process.env.NODE_ENV === 'production') {
      // 本番環境では構造化JSONとして出力
      console.log(JSON.stringify(entry));
    } else {
      // 開発環境では読みやすい形式で出力
      const { level, message, context, error } = entry;
      const logMethod =
        level === LogLevel.ERROR || level === LogLevel.FATAL ? console.error : console.log;

      logMethod(`[${level.toUpperCase()}] ${message}`, {
        context,
        ...(error && { error }),
      });
    }
  }

  /**
   * デバッグログ
   */
  debug(message: string, context?: Partial<LogContext>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.log(entry);
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: Partial<LogContext>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.log(entry);
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: Partial<LogContext>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.log(entry);
  }

  /**
   * エラーログ
   */
  error(message: string, error?: Error, context?: Partial<LogContext>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.log(entry);
  }

  /**
   * 致命的エラーログ
   */
  fatal(message: string, error?: Error, context?: Partial<LogContext>): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error);
    this.log(entry);
  }

  /**
   * 子ロガーを作成（コンテキストを追加）
   */
  child(additionalContext: Partial<LogContext>): StructuredLogger {
    return new StructuredLogger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * HTTPリクエストログ
   */
  logRequest(
    request: NextRequest,
    response: { status: number; duration: number },
    userId?: string
  ): void {
    const context: Partial<LogContext> = {
      method: request.method,
      path: request.nextUrl.pathname,
      statusCode: response.status,
      duration: response.duration,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userId,
    };

    const level =
      response.status >= 500
        ? LogLevel.ERROR
        : response.status >= 400
          ? LogLevel.WARN
          : LogLevel.INFO;

    if (this.shouldLog(level)) {
      const message = `${request.method} ${request.nextUrl.pathname} ${response.status} ${response.duration}ms`;
      const entry = this.createLogEntry(level, message, context);
      this.log(entry);
    }
  }
}

/**
 * リクエストIDを生成
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * リクエストからロガーを作成
 */
export function createRequestLogger(request: NextRequest, requestId?: string): StructuredLogger {
  return new StructuredLogger({
    requestId: requestId || generateRequestId(),
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  });
}

/**
 * デフォルトロガー
 */
export const logger = new StructuredLogger();
