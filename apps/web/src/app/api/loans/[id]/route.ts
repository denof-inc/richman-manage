import { NextResponse } from 'next/server';
import loans from '../../../../../mock/loans.json';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const loan = loans.find((l) => l.id === params.id);

  if (!loan) {
    return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  }

  // property_name を property に変換してレスポンス
  return NextResponse.json({
    ...loan,
    property: loan.property_name,
  });
}
