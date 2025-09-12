import { z } from 'zod';
import 'zod-openapi';
import {
  RentRollResponseSchema,
  CreateRentRollSchema,
  UpdateRentRollSchema,
} from '@/lib/api/schemas/rent-roll';

export const rentRollsPaths = {
  '/api/rent-rolls': {
    get: {
      tags: ['RentRolls'],
      operationId: 'listRentRolls',
      summary: 'レントロール一覧を取得',
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { in: 'query', name: 'property_id', schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: z.array(RentRollResponseSchema) } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    post: {
      tags: ['RentRolls'],
      operationId: 'createRentRoll',
      summary: 'レントロールを作成',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: CreateRentRollSchema } },
      },
      responses: {
        201: {
          description: '作成成功',
          content: { 'application/json': { schema: RentRollResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/api/rent-rolls/{id}': {
    get: {
      tags: ['RentRolls'],
      operationId: 'getRentRoll',
      summary: 'レントロール詳細を取得',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: RentRollResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    put: {
      tags: ['RentRolls'],
      operationId: 'updateRentRoll',
      summary: 'レントロールを更新',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: UpdateRentRollSchema } },
      },
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: RentRollResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    delete: {
      tags: ['RentRolls'],
      operationId: 'deleteRentRoll',
      summary: 'レントロールを削除（論理削除）',
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
