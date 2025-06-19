import { render, screen, fireEvent } from '@testing-library/react';
import FontSizeSelector, { getCurrentFontSize, resetFontSize } from './FontSizeSelector';

// localStorage をモック
const mockLocalStorage: {
  store: Record<string, string>;
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
} = {
  store: {},
  getItem: jest.fn((key: string): string | null => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string): void => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key: string): void => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn((): void => {
    mockLocalStorage.store = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// document.documentElement をモック
const mockClassList = {
  add: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
};

Object.defineProperty(document, 'documentElement', {
  value: {
    classList: mockClassList,
  },
  writable: true,
});

// TODO: React型定義競合解決後にテストを有効化（Issue #61）
describe.skip('FontSizeSelector', () => {
  beforeEach(() => {
    // テスト前にモックをリセット
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test('初期状態では中サイズが選択されている', () => {
    render(<FontSizeSelector />);

    expect(screen.getByText('中')).toBeInTheDocument();
  });

  test('大ボタンクリックで文字サイズが大に変更される', () => {
    render(<FontSizeSelector />);

    const largeButton = screen.getByLabelText('文字サイズ大');
    fireEvent.click(largeButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('richman-font-size', 'large');
  });

  test('小ボタンクリックで文字サイズが小に変更される', () => {
    render(<FontSizeSelector />);

    const smallButton = screen.getByLabelText('文字サイズ小');
    fireEvent.click(smallButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('richman-font-size', 'small');
  });

  test('選択中のボタンが強調表示される', () => {
    // 初期状態を大サイズに設定
    mockLocalStorage.setItem('richman-font-size', 'large');

    render(<FontSizeSelector />);

    const largeButton = screen.getByLabelText('文字サイズ大');
    expect(largeButton).toHaveClass('bg-primary');
  });

  test('各ボタンが正しくレンダリングされる', () => {
    render(<FontSizeSelector />);

    expect(screen.getByLabelText('文字サイズ小')).toBeInTheDocument();
    expect(screen.getByLabelText('文字サイズ中')).toBeInTheDocument();
    expect(screen.getByLabelText('文字サイズ大')).toBeInTheDocument();
    expect(screen.getByLabelText('文字サイズ特大')).toBeInTheDocument();
  });

  test('showLabel=trueの場合ラベルが表示される', () => {
    render(<FontSizeSelector showLabel={true} />);

    expect(screen.getByText('文字サイズ')).toBeInTheDocument();
  });

  test('showLabel=falseの場合ラベルが表示されない', () => {
    render(<FontSizeSelector showLabel={false} />);

    expect(screen.queryByText('文字サイズ')).not.toBeInTheDocument();
  });

  test('CSSクラスが正しく適用される', () => {
    render(<FontSizeSelector />);

    const largeButton = screen.getByLabelText('文字サイズ大');
    fireEvent.click(largeButton);

    expect(mockClassList.remove).toHaveBeenCalledWith(
      'font-size-small',
      'font-size-medium',
      'font-size-large',
      'font-size-extra-large'
    );
    expect(mockClassList.add).toHaveBeenCalledWith('font-size-large');
  });
});

// TODO: React型定義競合解決後にテストを有効化（Issue #61）
describe.skip('FontSizeSelector ヘルパー関数', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test('getCurrentFontSize: 保存された値を正しく取得する', () => {
    mockLocalStorage.setItem('richman-font-size', 'large');

    const fontSize = getCurrentFontSize();
    expect(fontSize).toBe('large');
  });

  test('getCurrentFontSize: 保存された値がない場合はmediumを返す', () => {
    const fontSize = getCurrentFontSize();
    expect(fontSize).toBe('medium');
  });

  test('getCurrentFontSize: 無効な値の場合はmediumを返す', () => {
    mockLocalStorage.setItem('richman-font-size', 'invalid');

    const fontSize = getCurrentFontSize();
    expect(fontSize).toBe('medium');
  });

  test('resetFontSize: 設定をリセットする', () => {
    mockLocalStorage.setItem('richman-font-size', 'large');

    resetFontSize();

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('richman-font-size');
    expect(mockClassList.remove).toHaveBeenCalledWith(
      'font-size-small',
      'font-size-medium',
      'font-size-large',
      'font-size-extra-large'
    );
    expect(mockClassList.add).toHaveBeenCalledWith('font-size-medium');
  });
});
