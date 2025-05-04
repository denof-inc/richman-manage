import AuthLayout from '../../components/layout/AuthLayout';
import AuthForm from '../../components/AuthForm';

export default function SignupPage() {
  return (
    <AuthLayout>
      <div className="card mx-auto max-w-sm">
        <AuthForm mode="signup" />
      </div>
    </AuthLayout>
  );
}
