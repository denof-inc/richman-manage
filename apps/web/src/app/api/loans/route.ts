import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { CreateLoanSchema, LoanQuerySchema, LoanResponseSchema } from '@/lib/api/schemas/loan';
import { mapLoanDbToDto } from '@/lib/mappers/loans';
import { mapLoanDtoToDbForCreate } from '@/lib/mappers/loans';
import { z } from 'zod';
import { getCache } from '@/lib/cache/redis-cache';
import { extractPaginationParams, calculatePaginationMeta } from '@/lib/api/pagination';

// パフォーマンス監視ユーティリティ（Edge Runtime対応）
const withPerformanceMonitoring = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();

  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: operationName,
        duration: Math.round(duration * 100) / 100,
        status: 'success',
      })
    );

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: operationName,
        duration: Math.round(duration * 100) / 100,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    throw error;
  }
};

// エラーメッセージのサニタイズ
const sanitizeErrorMessage = (message: string): string => {
  // パスワードやトークンなどの機密情報を除去
  return message
    .replace(/password[=:][\S]+/gi, 'password=***')
    .replace(/token[=:][\S]+/gi, 'token=***')
    .replace(/secret[=:][\S]+/gi, 'secret=***')
    .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***@')
    .replace(/mysql:\/\/[^@]+@/gi, 'mysql://***@')
    .replace(/mongodb:\/\/[^@]+@/gi, 'mongodb://***@');
};

const hasSupabaseCode = (e: unknown): e is { code: string; message: string } =>
  typeof e === 'object' && e !== null && 'code' in (e as Record<string, unknown>);

// 統一エラーハンドリング（Edge Runtime対応）
const handleApiError = (error: unknown, context: string) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? sanitizeErrorMessage(error.message) : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (error instanceof z.ZodError) {
    console.warn('API Validation:', JSON.stringify(errorInfo));
  } else if (hasSupabaseCode(error)) {
    console.warn('API ClientError:', JSON.stringify(errorInfo));
  } else {
    console.error('API Error:', JSON.stringify(errorInfo));
  }

  if (error instanceof z.ZodError) {
    const messages = error.errors.map((e) => e.message).join(', ');
    return ApiResponse.validationError(messages, error.errors);
  }

  if (hasSupabaseCode(error)) {
    const supabaseError = error;
    if (supabaseError.code === 'PGRST116') {
      return ApiResponse.notFound('リソースが見つかりません');
    }
    return ApiResponse.badRequest(sanitizeErrorMessage(supabaseError.message));
  }

  return ApiResponse.internalError('予期しないエラーが発生しました');
};

// GET /api/loans - 借入一覧取得
/**
 * @swagger
 * /api/loans:
 *   get:
 *     tags: [Loans]
 *     summary: 借入一覧を取得
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: property_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 成功
 */
export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const supabase = createClient();

      // 認証チェック
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return ApiResponse.unauthorized();
      }

      // ページネーションパラメータを抽出
      const paginationParams = extractPaginationParams(request.nextUrl);

      // その他のクエリパラメータをパース
      const searchParams = Object.fromEntries(request.nextUrl.searchParams);
      const query = {
        ...LoanQuerySchema.parse(searchParams),
        ...paginationParams,
      };

      // データベースクエリ構築（owners 連携は未適用DBでも動くようフォールバック）
      const buildQuery = (withOwnerJoin: boolean) => {
        const selectColumns = withOwnerJoin
          ? '*, property:properties!left(id, user_id, name), owner:owners!left(id, user_id, name)'
          : '*, property:properties!left(id, user_id, name)';
        let q = supabase.from('loans').select(selectColumns, { count: 'exact' });
        // 所有者チェック（ownersがない環境ではproperties.user_idのみで制限）
        q = withOwnerJoin
          ? q.or(`properties.user_id.eq.${user.id},owners.user_id.eq.${user.id}`)
          : q.eq('properties.user_id', user.id);
        return q;
      };

      let dbQuery = buildQuery(true);

      // 検索フィルタ
      if (query.search) {
        dbQuery = dbQuery.ilike('lender_name', `%${query.search}%`);
      }

      // 物件IDフィルタ
      if (query.property_id) dbQuery = dbQuery.eq('property_id', query.property_id);
      if (query.owner_id) dbQuery = dbQuery.eq('owner_id', query.owner_id);

      // 借入タイプフィルタ
      if (query.loan_type) {
        dbQuery = dbQuery.eq('loan_type', query.loan_type);
      }

      // ソート適用
      if (paginationParams.sort) {
        dbQuery = dbQuery.order(paginationParams.sort, {
          ascending: paginationParams.order === 'asc',
        });
      }

      // ページネーション範囲適用
      const from = (paginationParams.page - 1) * paginationParams.limit;
      const to = from + paginationParams.limit - 1;

      // クエリ実行（パフォーマンス監視付き）
      let { data, error, count } = await withPerformanceMonitoring(
        async () => await dbQuery.range(from, to),
        'loans.database.query'
      );

      // ownersテーブル未適用などで結合に失敗した場合はフォールバック（property結合のみ）
      if (error) {
        const msg = (error as { message?: string }).message || '';
        const looksLikeOwnerJoinIssue =
          /owners|relationship|foreign key|relation .* does not exist|failed to parse logic tree|syntax error/i.test(
            msg
          );
        if (looksLikeOwnerJoinIssue) {
          const fallbackQuery = buildQuery(false);
          const res = await withPerformanceMonitoring(
            async () => await fallbackQuery.range(from, to),
            'loans.database.query.fallback_without_owner'
          );
          data = res.data;
          error = res.error;
          count = res.count;

          // さらに失敗する場合（リレーション名解決不可など）は property_id リストでフィルタ
          if (error) {
            const { data: props, error: propErr } = await withPerformanceMonitoring(
              async () => await supabase.from('properties').select('id').eq('user_id', user.id),
              'properties.database.ids_for_loans_filter'
            );

            if (!propErr) {
              const ids = (props || []).map((p: { id: string }) => p.id);
              let q = supabase.from('loans').select('*', { count: 'exact' });
              if (ids.length > 0) {
                q = q.in('property_id', ids);
              } else {
                // 空集合フィルタ（確実に0件返す）
                q = q.eq('id', '00000000-0000-0000-0000-000000000000');
              }
              const res2 = await withPerformanceMonitoring(
                async () => await q.range(from, to),
                'loans.database.query.fallback_property_ids'
              );
              data = res2.data;
              error = res2.error;
              count = res2.count;
            }
          }
        }
      }

      if (error) throw error;

      // レスポンス形式に変換（property情報を除外）+ DB→DTO正規化
      const loans =
        data?.map((row) => {
          const normalized = mapLoanDbToDto(row as unknown as Record<string, unknown>);
          return LoanResponseSchema.parse(normalized);
        }) || [];

      // ページネーションメタデータを計算
      const meta = calculatePaginationMeta(paginationParams, count || 0);

      return ApiResponse.paginated(loans, meta.page, meta.limit, meta.total);
    } catch (error) {
      return handleApiError(error, 'GET /api/loans');
    }
  }, 'GET /api/loans');
}

// POST /api/loans - 借入作成
export async function POST(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const supabase = createClient();
      const cache = getCache();

      // 認証チェック
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return ApiResponse.unauthorized();
      }

      // リクエストボディをパース
      let body;
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const validatedData = CreateLoanSchema.parse(body);

      // 物件の所有権確認（物件指定時のみ）
      if (validatedData.property_id) {
        const { data: property, error: propertyError } = await withPerformanceMonitoring(
          async () =>
            await supabase
              .from('properties')
              .select('id')
              .eq('id', validatedData.property_id)
              .eq('user_id', user.id)
              .single(),
          'loans.check.property_ownership'
        );
        if (propertyError || !property) {
          return ApiResponse.forbidden('この物件に対する借入を作成する権限がありません');
        }
      }

      // 所有者（owner）の補完: owner_id未指定の場合は既定の所有者を作成/取得
      let ownerId = validatedData.owner_id;
      if (!ownerId) {
        try {
          const { data: existingOwner, error: ownerFetchError } = await supabase
            .from('owners')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .single();
          if (!ownerFetchError && existingOwner?.id) {
            ownerId = existingOwner.id as string;
          } else {
            const { data: createdOwner } = await supabase
              .from('owners')
              .insert({ user_id: user.id, name: 'デフォルト所有者', owner_kind: 'individual' })
              .select('id')
              .single();
            ownerId = (createdOwner?.id as string | undefined) ?? undefined;
          }
        } catch {
          // ownersテーブルが未整備/モック未設定などの場合はスキップ（owner_idなしで継続）
        }
      }

      // DTO→DB 変換（軽量適用）。既存スキーマ互換の安全キーのみ送信。
      const mapped = mapLoanDtoToDbForCreate({ ...validatedData, owner_id: ownerId });
      const safeInsert = {
        property_id: mapped.property_id,
        owner_id: mapped.owner_id ?? null,
        lender_name: mapped.lender_name,
        branch_name: mapped.branch_name ?? null,
        loan_type: mapped.loan_type,
        principal_amount: mapped.principal_amount,
        current_balance: mapped.current_balance,
        interest_rate: mapped.interest_rate, // 既存スキーマ互換
        loan_term_months: mapped.loan_term_months,
        monthly_payment: mapped.monthly_payment,
        notes: mapped.notes ?? null,
      };

      // データベースに借入情報を保存
      const { data: newLoan, error: dbError } = await withPerformanceMonitoring(
        async () => await supabase.from('loans').insert(safeInsert).select().single(),
        'loans.database.insert'
      );

      if (dbError) {
        throw dbError;
      }

      // レスポンス形式に変換
      const loanResponse = LoanResponseSchema.parse(newLoan);

      // ユーザー固有のキャッシュを無効化
      await cache.invalidateResource('loans', user.id);

      return ApiResponse.success(loanResponse, undefined, 201);
    } catch (error) {
      return handleApiError(error, 'POST /api/loans');
    }
  }, 'POST /api/loans');
}
