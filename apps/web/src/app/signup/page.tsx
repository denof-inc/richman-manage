export const dynamic = 'force-dynamic';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthForm from '../../components/AuthForm';

export default function SignupPage() {
  return (
    <AuthLayout>
      <div className="card mx-auto max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-primary">新規登録</h1>
        <AuthForm mode="signup" />
      </div>
    </AuthLayout>
  );
}
