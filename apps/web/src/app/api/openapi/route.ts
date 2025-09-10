import { NextResponse } from 'next/server';
import { generateOpenAPIDoc } from '@/lib/api/openapi/document';

export const dynamic = 'force-static';

export async function GET() {
  const doc = generateOpenAPIDoc();
  return NextResponse.json(doc);
}
