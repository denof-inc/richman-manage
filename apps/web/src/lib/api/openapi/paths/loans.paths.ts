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
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { in: 'query', name: 'property_id', schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: z.array(LoanResponseSchema) } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
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
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
} as const;
