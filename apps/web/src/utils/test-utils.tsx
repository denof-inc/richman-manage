import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Next.jsのuseRouterをモック
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
}));

// テスト用のラッパーコンポーネント
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// テスト用ユーティリティをre-export
export * from '@testing-library/react';
export { customRender as render };
