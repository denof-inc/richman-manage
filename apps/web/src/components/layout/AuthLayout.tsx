import React from 'react';

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
    <div className="bg-base-100 flex min-h-screen flex-col items-center justify-center">
      <div className="w-full px-4 py-8">{children}</div>
    </div>
  );
}
