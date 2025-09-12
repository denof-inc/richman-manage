import { z } from 'zod';
import 'zod-openapi';
import { UserResponseSchema, CreateUserSchema, UpdateUserSchema } from '@/lib/api/schemas/user';

export const usersPaths = {
  '/api/users': {
    get: {
      tags: ['Users'],
      operationId: 'listUsers',
      summary: 'ユーザー一覧を取得',
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: z.array(UserResponseSchema) } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    post: {
      tags: ['Users'],
      operationId: 'createUser',
      summary: 'ユーザーを作成',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: CreateUserSchema } },
      },
      responses: {
        201: {
          description: '作成成功',
          content: { 'application/json': { schema: UserResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/api/users/{id}': {
    get: {
      tags: ['Users'],
      operationId: 'getUser',
      summary: 'ユーザー詳細を取得',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: UserResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    put: {
      tags: ['Users'],
      operationId: 'updateUser',
      summary: 'ユーザーを更新',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: UpdateUserSchema } },
      },
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: UserResponseSchema } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
    delete: {
      tags: ['Users'],
      operationId: 'deleteUser',
      summary: 'ユーザーを削除（論理削除）',
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
