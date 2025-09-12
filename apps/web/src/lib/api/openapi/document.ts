import { createDocument } from 'zod-openapi';
import { ownersPaths } from '@/lib/api/openapi/paths/owners.paths';
import { loansPaths } from '@/lib/api/openapi/paths/loans.paths';
import { ApiErrorSchema, ErrorResponseSchema, ApiMetaSchema } from '@/lib/api/schemas/common';
import { OwnerResponseSchema } from '@/lib/api/schemas/owner';
import { LoanResponseSchema } from '@/lib/api/schemas/loan';

export function generateOpenAPIDoc() {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'RichmanManage API',
      version: '1.0.0',
      description: '不動産投資管理システムのAPI仕様（Zod由来）',
    },
    servers: [
      { url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'ページ番号（1始まり）',
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          description: '1ページあたり件数',
        },
      },
      responses: {
        Unauthorized: {
          description: '認証エラー',
          content: { 'application/json': { schema: ErrorResponseSchema } },
        },
        ValidationError: {
          description: 'バリデーションエラー',
          content: { 'application/json': { schema: ErrorResponseSchema } },
        },
        NotFound: {
          description: '対象が見つかりません',
          content: { 'application/json': { schema: ErrorResponseSchema } },
        },
        BadRequest: {
          description: '不正なリクエスト',
          content: { 'application/json': { schema: ErrorResponseSchema } },
        },
      },
      schemas: {
        ApiError: ApiErrorSchema,
        ErrorResponse: ErrorResponseSchema,
        ApiMeta: ApiMetaSchema,
        Owner: OwnerResponseSchema,
        Loan: LoanResponseSchema,
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      ...ownersPaths,
      ...loansPaths,
    },
    tags: [
      { name: 'Owners', description: '所有者管理API' },
      { name: 'Loans', description: '借入管理API' },
    ],
  });
}
