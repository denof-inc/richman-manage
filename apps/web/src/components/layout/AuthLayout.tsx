import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-base-100 flex min-h-screen flex-col items-center justify-center">
      <div className="w-full px-4 py-8">{children}</div>
    </div>
  );
}
