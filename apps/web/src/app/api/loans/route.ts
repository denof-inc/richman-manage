import { NextResponse } from 'next/server';

import loans from '../../../../mock/loans.json';

export function GET() {
  return NextResponse.json(loans);
}
