import React from 'react';
import Spinner from './Spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  loading?: boolean;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function LoadingOverlay({
  loading = false,
  text = '読み込み中...',
  className,
  children,
}: LoadingOverlayProps) {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative', className)}>
      {children && <div className="pointer-events-none opacity-50">{children}</div>}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          {text && <p className="text-sm font-medium text-gray-600">{text}</p>}
        </div>
      </div>
    </div>
  );
}
