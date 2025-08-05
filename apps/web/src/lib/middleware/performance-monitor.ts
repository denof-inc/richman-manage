import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger, generateRequestId } from '@/lib/logging/structured-logger';

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  requestId: string;
  timestamp: string;
  duration: number;
  method: string;
  path: string;
  statusCode: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
}

/**
 * パフォーマンスモニター設定
 */
export interface PerformanceMonitorConfig {
  enabled?: boolean;
  slowRequestThreshold?: number; // ミリ秒
  logSlowRequests?: boolean;
  collectMemoryMetrics?: boolean;
  collectCpuMetrics?: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  enabled: true,
  slowRequestThreshold: 1000, // 1秒
  logSlowRequests: true,
  collectMemoryMetrics: true,
  collectCpuMetrics: process.platform !== 'win32', // Windows以外で有効
};

/**
 * パフォーマンスモニタリングミドルウェア
 */
export function performanceMonitor(config: PerformanceMonitorConfig = DEFAULT_CONFIG) {
  return async function middleware(
    request: NextRequest,
    event: { waitUntil: (promise: Promise<unknown>) => void }
  ) {
    if (!config.enabled) {
      return NextResponse.next();
    }

    const startTime = Date.now();
    const requestId = generateRequestId();
    const logger = createRequestLogger(request, requestId);

    // CPUタイム測定開始
    const startCpuUsage = config.collectCpuMetrics ? process.cpuUsage() : undefined;

    // リクエストヘッダーに追加
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);

    // レスポンス処理
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // レスポンスヘッダーに追加
    response.headers.set('x-request-id', requestId);

    // パフォーマンス測定を非同期で実行
    event.waitUntil(
      Promise.resolve().then(async () => {
        const duration = Date.now() - startTime;

        // メトリクスを収集
        const metrics: PerformanceMetrics = {
          requestId,
          timestamp: new Date().toISOString(),
          duration,
          method: request.method,
          path: request.nextUrl.pathname,
          statusCode: response.status,
          memoryUsage: config.collectMemoryMetrics
            ? process.memoryUsage()
            : { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
        };

        // CPU使用率を計算
        if (config.collectCpuMetrics && startCpuUsage) {
          const endCpuUsage = process.cpuUsage(startCpuUsage);
          metrics.cpuUsage = {
            user: endCpuUsage.user / 1000, // マイクロ秒からミリ秒に変換
            system: endCpuUsage.system / 1000,
          };
        }

        // 遅いリクエストをログ出力
        if (config.logSlowRequests && duration > (config.slowRequestThreshold || 1000)) {
          logger.warn('Slow request detected', {
            duration,
            threshold: config.slowRequestThreshold,
            ...metrics,
          });
        }

        // メトリクスを外部システムに送信（実装例）
        await sendMetrics(metrics);
      })
    );

    return response;
  };
}

/**
 * メトリクスを外部システムに送信
 * 実際の実装では、DatadogやNew Relicなどのモニタリングサービスに送信
 */
async function sendMetrics(metrics: PerformanceMetrics): Promise<void> {
  // 開発環境では詳細ログを出力
  if (process.env.NODE_ENV === 'development') {
    console.log('[METRICS]', {
      requestId: metrics.requestId,
      path: `${metrics.method} ${metrics.path}`,
      duration: `${metrics.duration}ms`,
      memory: `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
      ...(metrics.cpuUsage && {
        cpu: `user: ${metrics.cpuUsage.user.toFixed(2)}ms, system: ${metrics.cpuUsage.system.toFixed(2)}ms`,
      }),
    });
  }

  // TODO: 実際のメトリクス送信実装
  // 例: await datadogClient.gauge('api.request.duration', metrics.duration, tags);
}

/**
 * APIルートハンドラー用パフォーマンスデコレーター
 */
export function withPerformanceMonitoring<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  options?: {
    name?: string;
    slowThreshold?: number;
  }
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();
    const [request] = args as [Request];

    try {
      const response = await handler(...args);
      const duration = Date.now() - startTime;

      // パフォーマンスログ
      if (duration > (options?.slowThreshold || 1000)) {
        console.warn(`[PERF] Slow API handler: ${options?.name || 'unknown'}`, {
          duration: `${duration}ms`,
          method: request.method,
          url: request.url,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PERF] API handler error: ${options?.name || 'unknown'}`, {
        duration: `${duration}ms`,
        error,
      });
      throw error;
    }
  }) as T;
}
