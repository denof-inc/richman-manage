import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiResponse } from '@/lib/api/response';
import { CreateOwnerSchema, OwnerResponseSchema } from '@/lib/api/schemas/owner';

export async function GET() {
  const supabase = createClient();
  // 認証
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return ApiResponse.unauthorized();

  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return ApiResponse.internalError('所有者一覧の取得に失敗しました');
  const owners = (data || []).map((o) => OwnerResponseSchema.parse(o));
  return ApiResponse.success(owners);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return ApiResponse.unauthorized();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {}
  const parsed = CreateOwnerSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join(', ');
    return ApiResponse.validationError(msg, parsed.error.errors);
  }

  const { data, error } = await supabase
    .from('owners')
    .insert({ user_id: user.id, name: parsed.data.name, owner_kind: parsed.data.owner_kind })
    .select('*')
    .single();
  if (error) return ApiResponse.internalError('所有者の作成に失敗しました');
  const owner = OwnerResponseSchema.parse(data);
  return ApiResponse.success(owner, undefined, 201);
}
