# Supabase Auth実装のベストプラクティス

## 1. Server Componentsでの認証状態確認
```ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function Page() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return <p>ログインしてください</p>;
  }
  
  return <p>ようこそ、{session.user.email} さん</p>;
}
```

## 2. Middleware設定
```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value || null;
  const url = req.nextUrl.clone();
  
  if (!token && url.pathname.startsWith('/dashboard')) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  
  if (token && url.pathname === '/login') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}
```

## 3. Cookie管理
- SupabaseのAuth Helpersが自動管理
- `sb-access-token`、`sb-refresh-token`などを自動処理
- サーバーコンポーネントでは`cookies`を使用

## 4. セッション更新の処理
```ts
useEffect(() => {
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = '/login';
    }
    if (event === 'TOKEN_REFRESHED') {
      // トークン更新時の処理
    }
  });
  
  return () => listener?.subscription.unsubscribe();
}, []);
```

## 必要なパッケージ
- @supabase/auth-helpers-nextjs
- @supabase/supabase-js