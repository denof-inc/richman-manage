import React from 'react';
import BaseLayout from './BaseLayout';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseLayout showSidebar={false}>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">{children}</div>
    </BaseLayout>
  );
}
