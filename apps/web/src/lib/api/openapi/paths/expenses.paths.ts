import { z } from 'zod';
import 'zod-openapi';
import {
  ExpenseResponseSchema,
  CreateExpenseSchema,
  UpdateExpenseSchema,
} from '@/lib/api/schemas/expense';

export const expensesPaths = {
  '/api/expenses': {
    get: {
      tags: ['Expenses'],
      operationId: 'listExpenses',
      summary: '支出一覧を取得',
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { in: 'query', name: 'property_id', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'category', schema: { type: 'string' } },
        { in: 'query', name: 'start_date', schema: { type: 'string', format: 'date-time' } },
        { in: 'query', name: 'end_date', schema: { type: 'string', format: 'date-time' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: z.array(ExpenseResponseSchema),
              examples: {
                sample: {
                  value: [
                    {
                      id: '550e8400-e29b-41d4-a716-446655441100',
                      property_id: '550e8400-e29b-41d4-a716-446655440000',
                      expense_date: '2024-05-01T00:00:00Z',
                      category: 'management_fee',
                      amount: 12000,
                      vendor: '管理会社A',
                      description: '管理費',
                      receipt_url: null,
                      is_recurring: true,
                      recurring_frequency: 'monthly',
                      created_at: '2024-05-01T00:00:00Z',
                      updated_at: '2024-05-01T00:00:00Z',
                      deleted_at: null,
                    },
                  ],
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    post: {
      tags: ['Expenses'],
      operationId: 'createExpense',
      summary: '支出を作成',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: CreateExpenseSchema } },
      },
      responses: {
        201: {
          description: '作成成功',
          content: {
            'application/json': {
              schema: ExpenseResponseSchema,
              examples: {
                created: {
                  value: {
                    id: '550e8400-e29b-41d4-a716-446655441101',
                    property_id: '550e8400-e29b-41d4-a716-446655440000',
                    expense_date: '2024-05-01T00:00:00Z',
                    category: 'management_fee',
                    amount: 12000,
                    vendor: '管理会社A',
                    description: '管理費',
                    receipt_url: null,
                    is_recurring: true,
                    recurring_frequency: 'monthly',
                    created_at: '2024-05-01T00:00:00Z',
                    updated_at: '2024-05-01T00:00:00Z',
                    deleted_at: null,
                  },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        400: { $ref: '#/components/responses/BadRequest' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/api/expenses/{id}': {
    get: {
      tags: ['Expenses'],
      operationId: 'getExpense',
      summary: '支出詳細を取得',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: ExpenseResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    put: {
      tags: ['Expenses'],
      operationId: 'updateExpense',
      summary: '支出を更新',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: UpdateExpenseSchema } },
      },
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: ExpenseResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    delete: {
      tags: ['Expenses'],
      operationId: 'deleteExpense',
      summary: '支出を削除（論理削除）',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '削除完了',
          content: { 'application/json': { schema: z.object({ message: z.string() }) } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
} as const;
