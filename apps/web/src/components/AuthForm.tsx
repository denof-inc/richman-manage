'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserClient } from '@/lib/auth/client';
import LoadingButton from '@/components/ui/LoadingButton';

const schema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
});

type FormValues = z.infer<typeof schema>;

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createBrowserClient();

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          // Supabaseエラーメッセージの日本語化
          switch (error.message) {
            case 'Invalid login credentials':
              setError('メールアドレスまたはパスワードが正しくありません');
              break;
            case 'Email not confirmed':
              setError('メールアドレスが確認されていません。確認メールをご確認ください');
              break;
            case 'Too many requests':
              setError('ログイン試行回数が上限に達しました。しばらく待ってから再度お試しください');
              break;
            case 'User not found':
              setError('このメールアドレスは登録されていません');
              break;
            default:
              setError(`ログインに失敗しました: ${error.message}`);
          }
          return;
        }

        // ログイン成功メッセージを表示
        setMessage('ログインしました。ダッシュボードに移動しています...');

        // 少し遅延してからリダイレクト（ユーザーに成功を伝えるため）
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);
      } else {
        const { error, data: authData } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          // Supabaseエラーメッセージの日本語化
          switch (error.message) {
            case 'User already registered':
              setError('このメールアドレスは既に登録されています');
              break;
            case 'Password should be at least 6 characters':
              setError('パスワードは6文字以上で入力してください');
              break;
            case 'Unable to validate email address: invalid format':
              setError('メールアドレスの形式が正しくありません');
              break;
            case 'Signup is disabled':
              setError('現在新規登録は無効になっています');
              break;
            default:
              setError(`新規登録に失敗しました: ${error.message}`);
          }
          return;
        }

        if (authData?.user?.identities?.length === 0) {
          // メールアドレスは既に登録されているが、確認されていない
          setMessage('確認メールを再送信しました。メールをご確認ください。');
        } else {
          // 新規登録成功
          setMessage(
            '確認メールを送信しました。メールをご確認の上、アカウントを有効化してください。'
          );
        }
      }
    } catch (e: unknown) {
      console.error('Unexpected auth error:', e);
      if (e instanceof Error) {
        setError(`予期しないエラーが発生しました: ${e.message}`);
      } else {
        setError('予期しないエラーが発生しました。しばらく待ってから再度お試しください。');
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
          id="email"
          type="email"
          {...register('email')}
          className="block w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-text-base">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="block w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-xs text-red-500">
            {errors.password.message}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3" role="alert">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {message && (
        <div className="rounded-md bg-green-50 p-3" role="status">
          <p className="text-sm text-green-800">{message}</p>
        </div>
      )}

      <LoadingButton type="submit" loading={loading} loadingText="送信中..." className="w-full">
        {mode === 'login' ? 'ログイン' : '新規登録'}
      </LoadingButton>

      <div className="mt-4 text-center text-sm">
        {mode === 'login' ? (
          <p>
            アカウントをお持ちでない方は{' '}
            <a href="/signup" className="text-primary hover:underline">
              新規登録
            </a>
          </p>
        ) : (
          <p>
            既にアカウントをお持ちの方は{' '}
            <a href="/login" className="text-primary hover:underline">
              ログイン
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
