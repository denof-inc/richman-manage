'use client';

// ProtectedRouteを使用するページは動的レンダリングが必要
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoanForm from '@/components/loans/LoanForm';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/api/client';
import { PropertyResponseSchema } from '@/lib/api/schemas/property';
import {
  CreateLoanSchema,
  type CreateLoanInput,
  type UpdateLoanInput,
} from '@/lib/api/schemas/loan';

export default function LoanNewPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await request('/api/properties', PropertyResponseSchema.array());
        if (!mounted) return;
        setProperties(
          (res.data || []).map((p) => ({ id: p.id as string, name: p.name as string }))
        );
      } catch (e) {
        console.warn('Failed to load properties', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async (values: CreateLoanInput | Partial<UpdateLoanInput>) => {
    setSubmitting(true);
    setServerError(null);
    try {
      // バリデーション（冪等）
      CreateLoanSchema.parse(values as CreateLoanInput);
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'same-origin',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const msg = json?.error?.message || '作成に失敗しました';
        setServerError(msg);
        return;
      }
      router.push('/loans');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '作成に失敗しました';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-6 text-2xl font-bold text-primary">借入の新規作成</h1>
          <LoanForm
            mode="create"
            properties={properties}
            onSubmit={handleCreate}
            submitting={submitting}
            serverError={serverError}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
