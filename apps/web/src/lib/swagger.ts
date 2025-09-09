import { createSwaggerSpec } from 'next-swagger-doc';

export async function getApiDocs() {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'RichmanManage API',
        version: '1.0.0',
        description: '不動産投資管理システムのAPI仕様',
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
          description: 'Local dev',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        parameters: {
          PageParam: {
            in: 'query',
            name: 'page',
            description: 'ページ番号(1以上)',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          LimitParam: {
            in: 'query',
            name: 'limit',
            description: '1-100',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          SortParam: {
            in: 'query',
            name: 'sort',
            description: '並び替え対象カラム',
            schema: { type: 'string' },
          },
          OrderParam: {
            in: 'query',
            name: 'order',
            description: 'asc/desc',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        schemas: {
          ApiError: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation Error' },
              details: { type: 'object', nullable: true },
            },
            required: ['code', 'message'],
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              data: { nullable: true, example: null },
              error: { $ref: '#/components/schemas/ApiError' },
            },
            required: ['success', 'data', 'error'],
          },
          Meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 100 },
              totalPages: { type: 'integer', example: 5 },
              hasNext: { type: 'boolean', example: true },
              hasPrev: { type: 'boolean', example: false },
            },
          },
        },
        responses: {
          BadRequest: {
            description: '不正なリクエスト',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          Unauthorized: {
            description: '認証エラー',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          Forbidden: {
            description: '権限エラー',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          NotFound: {
            description: 'リソースが見つかりません',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          ValidationError: {
            description: 'バリデーションエラー',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          RateLimited: {
            description: 'レート制限超過',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          InternalError: {
            description: 'サーバーエラー',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Loans', description: '借入管理API' },
        { name: 'Properties', description: '物件管理API' },
        { name: 'Owners', description: '所有者管理API' },
        { name: 'RentRolls', description: 'レントロール管理API' },
        { name: 'Expenses', description: '支出管理API' },
        { name: 'Users', description: 'ユーザー管理API' },
      ],
    },
  });
  return spec;
}
