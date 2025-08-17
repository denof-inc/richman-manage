'use client';

import React from 'react';
import { useToast } from './toast-context';

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-start sm:justify-end">
      <div className="flex w-full flex-col gap-3 sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded border p-3 shadow-md ${
              t.type === 'error'
                ? 'border-red-300 bg-red-50 text-red-800'
                : t.type === 'success'
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : t.type === 'warning'
                    ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                    : 'border-gray-300 bg-white text-gray-800'
            }`}
          >
            {t.title ? <div className="mb-1 font-semibold">{t.title}</div> : null}
            <div className="text-sm">{t.message}</div>
            <div className="mt-2 flex items-center gap-2">
              {t.onAction && t.actionLabel ? (
                <button
                  className="rounded bg-gray-800 px-2 py-1 text-xs text-white hover:bg-gray-700"
                  onClick={() => {
                    t.onAction?.();
                    dismiss(t.id);
                  }}
                >
                  {t.actionLabel}
                </button>
              ) : null}
              <button
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                onClick={() => dismiss(t.id)}
              >
                閉じる
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
