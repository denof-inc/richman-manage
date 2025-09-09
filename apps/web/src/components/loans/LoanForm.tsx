'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';

import {
  CreateLoanSchema,
  UpdateLoanSchema,
  type CreateLoanInput,
  type UpdateLoanInput,
  LoanTypeSchema,
} from '@/lib/api/schemas/loan';

type Mode = 'create' | 'edit';

export type LoanFormValues = z.infer<typeof CreateLoanSchema>;

type PropertyOption = { id: string; name: string };
type OwnerOption = { id: string; name: string };

type LoanFormProps = {
  mode: Mode;
  defaultValues?: Partial<LoanFormValues>;
  properties: PropertyOption[];
  owners?: OwnerOption[];
  onSubmit: (values: CreateLoanInput | Partial<UpdateLoanInput>) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
  serverError?: string | null;
};

export default function LoanForm({
  mode,
  defaultValues,
  properties,
  owners,
  onSubmit,
  onDelete,
  submitting,
  serverError,
}: LoanFormProps) {
  const schema = mode === 'create' ? CreateLoanSchema : UpdateLoanSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(schema as unknown as z.ZodTypeAny),
    defaultValues: (() => {
      const dv = (defaultValues || {}) as Partial<LoanFormValues> & { owner_id?: string };
      return {
        property_id: dv.property_id ?? '',
        lender_name: dv.lender_name ?? '',
        branch_name: (dv as Partial<LoanFormValues>).branch_name ?? ('' as unknown as string),
        loan_type: (dv.loan_type as LoanFormValues['loan_type']) ?? 'mortgage',
        principal_amount: dv.principal_amount ?? ('' as unknown as number),
        current_balance: dv.current_balance ?? ('' as unknown as number),
        interest_rate: dv.interest_rate ?? ('' as unknown as number),
        loan_term_months: dv.loan_term_months ?? ('' as unknown as number),
        monthly_payment: dv.monthly_payment ?? ('' as unknown as number),
        notes: (dv as Partial<LoanFormValues>).notes ?? ('' as unknown as string),
      } as LoanFormValues;
    })(),
  });

  const onValid = async (values: LoanFormValues) => {
    if (mode === 'create') {
      await onSubmit(values as CreateLoanInput);
    } else {
      // Updateは任意項目。未入力は送らないようフィルタ
      const payload: Partial<UpdateLoanInput> = {};
      const keys: (keyof UpdateLoanInput)[] = [
        'lender_name',
        'loan_type',
        'current_balance',
        'interest_rate',
        'monthly_payment',
      ];
      const out = payload as Partial<Record<keyof UpdateLoanInput, unknown>>;
      keys.forEach((k) => {
        const v = (values as Record<string, unknown>)[k as string];
        if (v !== undefined && v !== null && v !== '') out[k] = v;
      });
      await onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {serverError ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      ) : null}

      {mode === 'create' && (
        <div>
          <label className="mb-1 block text-sm font-medium">物件</label>
          <select
            className="w-full rounded border px-3 py-2"
            {...register('property_id')}
            defaultValue={defaultValues?.property_id ?? ''}
          >
            <option value="">選択してください</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.property_id && (
            <p className="mt-1 text-xs text-red-600">{errors.property_id.message as string}</p>
          )}
        </div>
      )}

      {owners && owners.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">借入主体（所有者）</label>
          <select
            className="w-full rounded border px-3 py-2"
            {...register('owner_id')}
            defaultValue={
              (defaultValues as Partial<LoanFormValues> & { owner_id?: string })?.owner_id ?? ''
            }
          >
            <option value="">選択してください</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">金融機関名</label>
          <input className="w-full rounded border px-3 py-2" {...register('lender_name')} />
          {errors.lender_name && (
            <p className="mt-1 text-xs text-red-600">{errors.lender_name.message as string}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">支店名</label>
          <input className="w-full rounded border px-3 py-2" {...register('branch_name')} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">借入タイプ</label>
          <select className="w-full rounded border px-3 py-2" {...register('loan_type')}>
            {LoanTypeSchema.options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.loan_type && (
            <p className="mt-1 text-xs text-red-600">{errors.loan_type.message as string}</p>
          )}
        </div>

        {mode === 'create' && (
          <div>
            <label className="mb-1 block text-sm font-medium">借入元本</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded border px-3 py-2"
              {...register('principal_amount', { valueAsNumber: true })}
            />
            {errors.principal_amount && (
              <p className="mt-1 text-xs text-red-600">
                {errors.principal_amount.message as string}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">現在残高</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded border px-3 py-2"
            {...register('current_balance', { valueAsNumber: true })}
          />
          {errors.current_balance && (
            <p className="mt-1 text-xs text-red-600">{errors.current_balance.message as string}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">金利(%)</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded border px-3 py-2"
            {...register('interest_rate', { valueAsNumber: true })}
          />
          {errors.interest_rate && (
            <p className="mt-1 text-xs text-red-600">{errors.interest_rate.message as string}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">借入期間(月)</label>
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            {...register('loan_term_months', { valueAsNumber: true })}
            disabled={mode === 'edit'}
          />
          {errors.loan_term_months && (
            <p className="mt-1 text-xs text-red-600">{errors.loan_term_months.message as string}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">月返済額</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded border px-3 py-2"
            {...register('monthly_payment', { valueAsNumber: true })}
          />
          {errors.monthly_payment && (
            <p className="mt-1 text-xs text-red-600">{errors.monthly_payment.message as string}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">メモ</label>
        <textarea className="w-full rounded border px-3 py-2" rows={4} {...register('notes')} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" className="bg-primary" disabled={!!submitting}>
          {mode === 'create' ? '作成' : '更新'}
        </Button>
        {mode === 'edit' && onDelete ? (
          <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={onDelete}>
            削除
          </Button>
        ) : null}
      </div>
    </form>
  );
}
