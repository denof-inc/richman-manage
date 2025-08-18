import React from 'react';
import BaseLayout from './BaseLayout';
import { ToastProvider } from '@/components/ui/toast-context';
import ToastViewport from '@/components/ui/toast';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <ToastProvider>
      <BaseLayout showSidebar={true}>{children}</BaseLayout>
      <ToastViewport />
    </ToastProvider>
  );
}
