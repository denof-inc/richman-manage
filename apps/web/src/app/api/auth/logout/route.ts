import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message || 'ログアウトに失敗しました' }, { status: 500 });
  }
}
