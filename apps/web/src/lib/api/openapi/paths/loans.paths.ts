import { z } from 'zod';
import 'zod-openapi';
import { LoanResponseSchema, CreateLoanSchema } from '@/lib/api/schemas/loan';

export const loansPaths = {
  '/api/loans': {
    get: {
      tags: ['Loans'],
      operationId: 'listLoans',
      summary: '借入一覧を取得',
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        { in: 'query', name: 'property_id', schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: z.array(LoanResponseSchema) } },
        },
        401: { description: '認証エラー' },
      },
    },
    post: {
      tags: ['Loans'],
      operationId: 'createLoan',
      summary: '借入を作成',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: CreateLoanSchema } },
      },
      responses: {
        201: {
          description: '作成成功',
          content: { 'application/json': { schema: LoanResponseSchema } },
        },
        401: { description: '認証エラー' },
        422: { description: 'バリデーションエラー' },
      },
    },
  },
} as const;
