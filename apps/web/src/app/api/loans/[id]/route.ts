import { NextResponse } from 'next/server';
import {
  mockLoans,
  mockProperties,
  mockLoanRepayments,
  mockLoanInterestChanges,
} from '../../../../data/mockData';
import { calculateRemainingBalance } from '../../../../lib/utils';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loan = mockLoans.find((l) => l.id === id);

  if (!loan) {
    return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  }

  const property = mockProperties.find((p) => p.id === loan.property_id);
  const remainingBalance = calculateRemainingBalance(loan, mockLoanRepayments);
  const interestChanges = mockLoanInterestChanges.filter((ic) => ic.loan_id === loan.id);
  const repayments = mockLoanRepayments.filter((r) => r.loan_id === loan.id);

  // レスポンスデータを構築
  const enrichedLoan = {
    id: loan.id,
    name: `${property?.name}ローン`,
    property_name: property?.name,
    property: property?.name, // LoanTableコンポーネント互換性のため
    lender: loan.lender_name,
    loanAmount: loan.loan_amount,
    remainingBalance: remainingBalance,
    interestRate: loan.interest_rate,
    interestType: loan.interest_type,
    repaymentType: loan.repayment_method,
    termYears: loan.term_years,
    startDate: loan.start_date,
    endDate: loan.end_date,
    monthlyPayment: loan.payment_amount,
    nextDue: '2023-12-15', // TODO: 実際の計算に基づく次回支払日
    interestChanges: interestChanges,
    repayments: repayments,
  };

  return NextResponse.json(enrichedLoan);
}
