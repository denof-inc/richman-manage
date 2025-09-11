import { z } from 'zod';
import 'zod-openapi';
import { LoanResponseSchema, CreateLoanSchema, UpdateLoanSchema } from '@/lib/api/schemas/loan';

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
  '/api/loans/{id}': {
    get: {
      tags: ['Loans'],
      operationId: 'getLoan',
      summary: '借入詳細を取得',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: LoanResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Loans'],
      operationId: 'updateLoan',
      summary: '借入を更新',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: UpdateLoanSchema } },
      },
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: LoanResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Loans'],
      operationId: 'deleteLoan',
      summary: '借入を削除（論理削除）',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '削除完了',
          content: {
            'application/json': {
              schema: z.object({ message: z.string() }),
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
} as const;
