import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button コンポーネント', () => {
  test('基本的なButtonが表示される', () => {
    render(<Button>ボタン</Button>);

    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveTextContent('ボタン');
  });

  test('variant="outline"のスタイルが適用される', () => {
    render(<Button variant="outline">アウトラインボタン</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('border', 'border-primary');
    expect(button).toHaveTextContent('アウトラインボタン');
  });

  test('size="sm"のスタイルが適用される', () => {
    render(<Button size="sm">小さいボタン</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-9', 'px-3');
    expect(button).toHaveTextContent('小さいボタン');
  });
});
