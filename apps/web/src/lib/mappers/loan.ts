import { LoanResponse } from '@/lib/api/schemas/loan';

export type LoanListViewModel = {
  id: string;
  name: string;
  property: string;
  lender: string;
  loanAmount: number;
  remainingBalance: number;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  repaymentType: 'principal_and_interest' | 'principal_equal';
  termYears: number;
  startDate: string;
  monthlyPayment: number;
};

export function toLoanListViewModel(
  loan: LoanResponse,
  propertyName: string | undefined
): LoanListViewModel {
  return {
    id: loan.id,
    name: loan.lender_name,
    property: propertyName ?? '-',
    lender: loan.lender_name,
    loanAmount: loan.principal_amount,
    remainingBalance: loan.current_balance,
    interestRate: loan.interest_rate,
    // 現状スキーマに金利タイプ/返済方式の区別がないため暫定値
    interestType: 'fixed',
    repaymentType: 'principal_and_interest',
    termYears: Math.floor((loan.loan_term_months ?? 0) / 12),
    startDate: loan.created_at,
    monthlyPayment: loan.monthly_payment,
  };
}
