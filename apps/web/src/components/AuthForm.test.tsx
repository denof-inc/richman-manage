import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AuthForm from './AuthForm';
import { createBrowserClient } from '@/lib/auth/client';

// Next.js routerのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Auth clientのモック
jest.mock('@/lib/auth/client', () => ({
  createBrowserClient: jest.fn(),
}));

describe('AuthForm', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();
  const mockSignInWithPassword = jest.fn();
  const mockSignUp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });

    (createBrowserClient as jest.Mock).mockReturnValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
      },
    });
  });

  describe('ログインモード', () => {
    it('ログインフォームが正しく表示される', () => {
      render(<AuthForm mode="login" />);

      expect(screen.getByLabelText('ログインフォーム')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
      expect(screen.getByText('新規登録')).toBeInTheDocument();
    });

    it('バリデーションエラーが表示される', async () => {
      render(<AuthForm mode="login" />);

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
        expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument();
      });
    });

    it('ログイン成功時にダッシュボードへリダイレクトする', async () => {
      jest.useFakeTimers();
      mockSignInWithPassword.mockResolvedValue({ error: null });

      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const submitButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // ログイン処理とメッセージ表示の確認
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(
          screen.getByText('ログインしました。ダッシュボードに移動しています...')
        ).toBeInTheDocument();
      });

      // setTimeout(1000ms)をスキップしてリダイレクト実行
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
        expect(mockRefresh).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    it('ログイン失敗時にエラーメッセージが表示される', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const submitButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('メールアドレスまたはパスワードが正しくありません')
        ).toBeInTheDocument();
      });
    });
  });

  describe('サインアップモード', () => {
    it('サインアップフォームが正しく表示される', () => {
      render(<AuthForm mode="signup" />);

      expect(screen.getByLabelText('新規登録フォーム')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument();
      expect(screen.getByText('ログイン')).toBeInTheDocument();
    });

    it('サインアップ成功時に確認メッセージが表示される', async () => {
      mockSignUp.mockResolvedValue({
        error: null,
        data: { user: { identities: [{}] } },
      });

      render(<AuthForm mode="signup" />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const submitButton = screen.getByRole('button', { name: '新規登録' });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: expect.stringContaining('/auth/callback'),
          },
        });
        expect(screen.getByText(/確認メールを送信しました/)).toBeInTheDocument();
      });
    });

    it('既存のメールアドレスでエラーメッセージが表示される', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'User already registered' },
      });

      render(<AuthForm mode="signup" />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const submitButton = screen.getByRole('button', { name: '新規登録' });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('このメールアドレスは既に登録されています')).toBeInTheDocument();
      });
    });
  });

  describe('共通機能', () => {
    it('送信中は送信ボタンが無効になる', async () => {
      mockSignInWithPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const submitButton = screen.getByRole('button', { name: 'ログイン' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '送信中...' })).toBeDisabled();
      });
    });

    it('アクセシビリティ属性が正しく設定されている', () => {
      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });
  });
});
