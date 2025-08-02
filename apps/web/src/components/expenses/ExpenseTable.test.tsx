import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExpenseTable from './ExpenseTable';

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockExpenses = [
  {
    id: 'expense-001',
    property_id: 'property-001',
    category: 'management_fee',
    amount: 25000,
    expense_date: new Date('2024-01-15'),
    vendor: '青山管理株式会社',
    description: '管理費（1月分）',
    property_name: '青山マンション',
  },
  {
    id: 'expense-002',
    property_id: 'property-001',
    category: 'tax',
    amount: 8500,
    expense_date: new Date('2024-01-20'),
    vendor: '港区役所',
    description: '固定資産税（第1期）',
    property_name: '青山マンション',
  },
];

describe('ExpenseTable', () => {
  const defaultProps = {
    expenses: mockExpenses,
    sortField: 'expense_date' as const,
    sortDirection: 'desc' as const,
    onSort: jest.fn(),
  };

  test('支出テーブルが表示される', () => {
    // window.matchMediaをモック
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === '(min-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { container } = render(<ExpenseTable {...defaultProps} />);

    // デスクトップビューのテーブルが表示される
    const desktopTable = container.querySelector('.hidden.md\\:block');
    expect(desktopTable).toBeInTheDocument();

    // テーブルヘッダーが存在する
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(6);
  });

  test('支出データが表示される', () => {
    render(<ExpenseTable {...defaultProps} />);

    // データが表示される（モバイルとデスクトップ両方に表示されるため、getAllByTextを使用）
    expect(screen.getAllByText('青山管理株式会社').length).toBeGreaterThan(0);
    expect(screen.getAllByText('管理費（1月分）').length).toBeGreaterThan(0);
    expect(screen.getAllByText('￥25,000').length).toBeGreaterThan(0);

    expect(screen.getAllByText('港区役所').length).toBeGreaterThan(0);
    expect(screen.getAllByText('固定資産税（第1期）').length).toBeGreaterThan(0);
    expect(screen.getAllByText('￥8,500').length).toBeGreaterThan(0);
  });

  test('支出がない場合のメッセージが表示される', () => {
    render(<ExpenseTable {...defaultProps} expenses={[]} />);

    // モバイルとデスクトップ両方に表示されるため、getAllByTextを使用
    const messages = screen.getAllByText('支出データがありません');
    expect(messages.length).toBeGreaterThan(0);
  });

  test('ソートインジケーターが表示される', () => {
    render(<ExpenseTable {...defaultProps} />);

    // expense_dateでソート中なのでインジケーターが表示される
    expect(screen.getByText('日付 ↓')).toBeInTheDocument();
  });

  test('カテゴリが表示される', () => {
    render(<ExpenseTable {...defaultProps} />);

    // カテゴリ名が表示される
    expect(screen.getAllByText('management_fee').length).toBeGreaterThan(0);
    expect(screen.getAllByText('tax').length).toBeGreaterThan(0);
  });
});
