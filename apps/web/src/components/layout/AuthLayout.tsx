import React from 'react';
import Header from './Header';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // ヘッダーが存在する場合は表示する仕組み（仮実装: Headerが未実装なので今はそのまま）
  // import Header from './Header';
  // return (
  //   <>
  //     <Header />
  //     <div className="bg-base-100 flex min-h-screen flex-col items-center justify-center">
  //       <div className="w-full px-4 py-8">{children}</div>
  //     </div>
  //   </>
  // );
  // Header.tsxが無いので現状は従来のセンタリングレイアウトを維持
  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={false} />
      <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-8">
        {children}
      </main>
    </div>
  );
}
