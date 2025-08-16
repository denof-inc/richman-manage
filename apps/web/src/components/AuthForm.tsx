'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
// サーバ側でセッションCookieを管理するため、フロントからはAPIを叩く

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isDummyMode = !supabaseUrl || !supabaseKey;

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    if (isDummyMode) {
      // ダミーモード: 常に「認証成功」とする
      setTimeout(() => {
        setLoading(false);
        router.push('/');
      }, 500);
      return;
    }
    // サーバ側API経由でCookieにセッションを設定
    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'ログインに失敗しました');
        }
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'サインアップに失敗しました');
        }
      }
      router.push('/');
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message || '認証エラーが発生しました');
      } else {
        setError('認証エラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      aria-label={mode === 'login' ? 'ログインフォーム' : '新規登録フォーム'}
    >
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-text-base">
          メールアドレス
        </label>
        <input
          type="email"
          {...register('email')}
          className="block w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          autoComplete="email"
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-text-base">
          パスワード
        </label>
        <input
          type="password"
          {...register('password')}
          className="block w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          autoComplete="current-password"
        />
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        className="w-full rounded-md bg-primary py-2 font-semibold text-white transition hover:bg-primary-light disabled:pointer-events-none disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '送信中...' : mode === 'login' ? 'ログイン' : '新規登録'}
      </button>
    </form>
  );
}
