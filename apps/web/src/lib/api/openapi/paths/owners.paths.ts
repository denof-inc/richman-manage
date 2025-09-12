import { z } from 'zod';
import 'zod-openapi';
import { CreateOwnerSchema, OwnerResponseSchema } from '@/lib/api/schemas/owner';

export const ownersPaths = {
  '/api/owners': {
    get: {
      tags: ['Owners'],
      operationId: 'listOwners',
      summary: '所有者一覧を取得',
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: z.array(OwnerResponseSchema) } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Owners'],
      operationId: 'createOwner',
      summary: '所有者を作成',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: CreateOwnerSchema } },
      },
      responses: {
        201: {
          description: '作成成功',
          content: { 'application/json': { schema: OwnerResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
} as const;
