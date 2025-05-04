import AuthLayout from '../../components/layout/AuthLayout';
import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="card mx-auto max-w-sm">
        <AuthForm mode="login" />
      </div>
    </AuthLayout>
  );
}
