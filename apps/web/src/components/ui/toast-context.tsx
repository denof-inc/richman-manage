'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

export type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextType = {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
  showError: (message: string, action?: { label: string; onAction: () => void }) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, ...toast }]);
      // 自動消滅（エラーは保持、他は5秒で消す）
      if (toast.type !== 'error') {
        setTimeout(() => dismiss(id), 5000);
      }
    },
    [dismiss]
  );

  const showError = useCallback(
    (message: string, action?: { label: string; onAction: () => void }) => {
      show({
        type: 'error',
        title: 'エラー',
        message,
        actionLabel: action?.label,
        onAction: action?.onAction,
      });
    },
    [show]
  );

  const value = useMemo(
    () => ({ toasts, show, dismiss, showError }),
    [toasts, show, dismiss, showError]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
