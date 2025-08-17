export const dynamic = 'force-dynamic';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="card mx-auto max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-primary">ログイン</h1>
        <AuthForm mode="login" />
        <div className="flex flex-col items-end">
          <a href="/forgot-password" className="mb-4 self-end text-sm text-accent hover:underline">
            パスワードをお忘れですか？
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}
