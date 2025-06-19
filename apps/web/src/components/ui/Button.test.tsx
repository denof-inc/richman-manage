import { render, screen } from '@testing-library/react';
import { Button } from '@richman/ui';

describe('Button asChild機能', () => {
  test('asChild=falseの場合、button要素が表示される', () => {
    render(<Button>ボタン</Button>);

    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveTextContent('ボタン');
  });

  test('asChild=trueの場合、Slotとして動作する', () => {
    render(
      <Button asChild>
        <a href="/test">リンク</a>
      </Button>
    );

    const link = screen.getByRole('link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveTextContent('リンク');
  });

  test('asChild=trueでもButtonのスタイルが適用される', () => {
    render(
      <Button asChild variant="outline">
        <a href="/test">スタイル付きリンク</a>
      </Button>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveClass('border', 'border-primary', 'bg-transparent');
  });
});
