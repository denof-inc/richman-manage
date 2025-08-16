import { z } from 'zod';

export const LoanRepaymentResponseSchema = z.object({
  id: z.string().uuid(),
  loan_id: z.string().uuid(),
  payment_date: z.string(),
  amount: z.number(),
  principal_amount: z.number(),
  interest_amount: z.number(),
  payment_method: z.string().nullable().optional(),
  reference_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type LoanRepaymentResponse = z.infer<typeof LoanRepaymentResponseSchema>;
