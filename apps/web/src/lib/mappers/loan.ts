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
  monthlyPayment: number; // 支払月額（元金+利息）
  monthlyPrincipal: number; // 元金返済額（推定）
  monthlyInterest: number; // 利息月額（推定）
};

export function toLoanListViewModel(
  loan: LoanResponse,
  propertyName: string | undefined
): LoanListViewModel {
  // 簡易分解: 利息= 残高×年利/12、元金 = 月額-利息
  const monthlyInterest = Math.max(
    Math.floor((loan.current_balance * (loan.interest_rate / 100)) / 12),
    0
  );
  const monthlyPrincipal = Math.max(loan.monthly_payment - monthlyInterest, 0);
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
    monthlyPrincipal,
    monthlyInterest,
  };
}
