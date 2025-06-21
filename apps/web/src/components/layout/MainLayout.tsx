import React from 'react';
import Header from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
}

export default function MainLayout({ children, isLoggedIn = true }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={isLoggedIn} />
      <main className="flex-grow pt-14 md:pt-0">{children}</main>
    </div>
  );
}
