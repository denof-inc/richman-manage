import { z } from 'zod';
import 'zod-openapi';
import {
  PropertyResponseSchema,
  CreatePropertySchema,
  UpdatePropertySchema,
  PropertyTypeSchema,
} from '@/lib/api/schemas/property';

export const propertiesPaths = {
  '/api/properties': {
    get: {
      tags: ['Properties'],
      operationId: 'listProperties',
      summary: '物件一覧を取得',
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          in: 'query',
          name: 'property_type',
          schema: { type: 'string', enum: [...PropertyTypeSchema.options] },
        },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: z.array(PropertyResponseSchema),
              examples: {
                sample: {
                  value: [
                    {
                      id: '550e8400-e29b-41d4-a716-446655440000',
                      user_id: '550e8400-e29b-41d4-a716-446655440001',
                      name: '青山マンション',
                      address: '東京都港区南青山1-1-1',
                      property_type: 'apartment',
                      purchase_price: 50000000,
                      purchase_date: '2023-04-01',
                      current_valuation: 52000000,
                      created_at: '2024-01-01T00:00:00Z',
                      updated_at: '2024-01-10T00:00:00Z',
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
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    post: {
      tags: ['Properties'],
      operationId: 'createProperty',
      summary: '物件を作成',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: CreatePropertySchema } },
      },
      responses: {
        201: {
          description: '作成成功',
          content: {
            'application/json': {
              schema: PropertyResponseSchema,
              examples: {
                created: {
                  value: {
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    user_id: '550e8400-e29b-41d4-a716-446655440001',
                    name: '青山マンション',
                    address: '東京都港区南青山1-1-1',
                    property_type: 'apartment',
                    purchase_price: 50000000,
                    purchase_date: '2023-04-01',
                    current_valuation: 52000000,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
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
  '/api/properties/{id}': {
    get: {
      tags: ['Properties'],
      operationId: 'getProperty',
      summary: '物件詳細を取得',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: PropertyResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    put: {
      tags: ['Properties'],
      operationId: 'updateProperty',
      summary: '物件を更新',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: UpdatePropertySchema } },
      },
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: PropertyResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    delete: {
      tags: ['Properties'],
      operationId: 'deleteProperty',
      summary: '物件を削除（論理削除）',
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
