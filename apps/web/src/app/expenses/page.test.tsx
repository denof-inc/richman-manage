import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExpenseListPage from './page';

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../../components/layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../components/expenses/ExpenseTable', () => ({
  __esModule: true,
  default: () => <div data-testid="expense-table">ExpenseTable</div>,
}));

jest.mock('../../data/mockData', () => ({
  mockExpenses: [],
  mockProperties: [],
  mockOwners: [],
  getPropertyExpenses: jest.fn(() => []),
}));

// AuthContextのモック
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
  }),
}));

describe('ExpenseListPage', () => {
  test('支出一覧画面が表示される', () => {
    render(<ExpenseListPage />);

    // タイトルが表示される
    expect(screen.getByText('支出一覧')).toBeInTheDocument();
  });

  test('支出を追加ボタンが表示される', () => {
    render(<ExpenseListPage />);

    const addButton = screen.getByText('+ 支出を追加');
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveClass('bg-primary');
  });

  test('検索入力フィールドが表示される', () => {
    render(<ExpenseListPage />);

    const searchInput = screen.getByPlaceholderText('カテゴリや説明で検索...');
    expect(searchInput).toBeInTheDocument();
  });

  test('物件フィルターが表示される', () => {
    render(<ExpenseListPage />);

    const propertyFilter = screen.getByRole('combobox');
    expect(propertyFilter).toBeInTheDocument();
    expect(screen.getByText('すべての物件')).toBeInTheDocument();
  });

  test('ExpenseTableコンポーネントが表示される', () => {
    render(<ExpenseListPage />);

    expect(screen.getByTestId('expense-table')).toBeInTheDocument();
  });
});
