import { NextResponse } from 'next/server';
import {
  mockLoans,
  mockProperties,
  mockLoanRepayments,
  calculateRemainingBalance,
} from '../../../data/mockData';

export function GET() {
  // 借入データに物件名と残債を追加
  const enrichedLoans = mockLoans.map((loan) => {
    const property = mockProperties.find((p) => p.id === loan.property_id);
    const remainingBalance = calculateRemainingBalance(loan, mockLoanRepayments);

    return {
      id: loan.id,
      name: `${property?.name}ローン`,
      property_name: property?.name,
      lender: loan.lender_name,
      loanAmount: loan.loan_amount,
      remainingBalance: remainingBalance,
      interestRate: loan.interest_rate,
      interestType: loan.interest_type,
      repaymentType: loan.repayment_method,
      termYears: loan.term_years,
      startDate: loan.start_date,
      monthlyPayment: loan.payment_amount,
      nextDue: '2023-12-15', // TODO: 実際の計算に基づく次回支払日
    };
  });

  return NextResponse.json(enrichedLoans);
}
