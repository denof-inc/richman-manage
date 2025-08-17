'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoanForm, { type LoanFormValues } from '@/components/loans/LoanForm';
import { useParams, useRouter } from 'next/navigation';
import { request } from '@/lib/api/client';
import { PropertyResponseSchema } from '@/lib/api/schemas/property';
import { LoanResponseSchema, type UpdateLoanInput } from '@/lib/api/schemas/loan';

export default function LoanEditPage() {
  const params = useParams<{ id: string }>();
  const loanId = params?.id as string;
  const router = useRouter();

  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [defaults, setDefaults] = useState<Partial<LoanFormValues> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [propsRes, loanRes] = await Promise.all([
          request('/api/properties', PropertyResponseSchema.array()),
          request(`/api/loans/${loanId}`, LoanResponseSchema),
        ]);
        if (!mounted) return;
        setProperties(
          (propsRes.data || []).map((p) => ({ id: p.id as string, name: p.name as string }))
        );
        const loan = loanRes.data;
        setDefaults({
          property_id: loan.property_id,
          lender_name: loan.lender_name,
          loan_type: loan.loan_type,
          principal_amount: loan.principal_amount,
          current_balance: loan.current_balance,
          interest_rate: loan.interest_rate,
          loan_term_months: loan.loan_term_months,
          monthly_payment: loan.monthly_payment,
        });
      } catch (e) {
        console.warn('Failed to load loan/properties', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loanId]);

  const handleUpdate = async (values: UpdateLoanInput) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'same-origin',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const msg = json?.error?.message || '更新に失敗しました';
        setServerError(msg);
        return;
      }
      router.push('/loans');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '更新に失敗しました';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const msg = json?.error?.message || '削除に失敗しました';
        setServerError(msg);
        return;
      }
      router.push('/loans');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '削除に失敗しました';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-6 text-2xl font-bold text-primary">借入の編集</h1>
          {defaults ? (
            <LoanForm
              mode="edit"
              defaultValues={defaults}
              properties={properties}
              onSubmit={handleUpdate}
              onDelete={handleDelete}
              submitting={submitting}
              serverError={serverError}
            />
          ) : (
            <div className="text-muted-foreground text-sm">読み込み中...</div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
