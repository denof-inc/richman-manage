import { createDocument } from 'zod-openapi';
import { ownersPaths } from './paths/owners.paths';
import { loansPaths } from './paths/loans.paths';
import {
  ApiErrorSchema,
  ErrorResponseSchema,
  ApiMetaSchema,
  ProblemDetailsSchema,
} from '../schemas/common';
import { OwnerResponseSchema } from '../schemas/owner';
import { LoanResponseSchema } from '../schemas/loan';
import { PropertyResponseSchema } from '../schemas/property';
import { ExpenseResponseSchema } from '../schemas/expense';
import { RentRollResponseSchema } from '../schemas/rent-roll';
import { UserResponseSchema } from '../schemas/user';
import { propertiesPaths } from './paths/properties.paths';
import { expensesPaths } from './paths/expenses.paths';
import { rentRollsPaths } from './paths/rent-rolls.paths';
import { usersPaths } from './paths/users.paths';

export function generateOpenAPIDoc() {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'RichmanManage API',
      version: '1.0.0',
      description: '不動産投資管理システムのAPI仕様（Zod由来）',
      contact: {
        name: 'RichmanManage Team',
        url: 'https://github.com/denof-inc/richman-manage',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
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
        SearchParam: {
          name: 'search',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: '検索キーワード（リソースにより適用対象は異なる）',
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'ソートキー（リソースに依存）',
        },
        OrderParam: {
          name: 'order',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          description: 'ソート順（asc/desc）',
        },
      },
      responses: {
        Unauthorized: {
          description: '認証エラー',
          content: { 'application/problem+json': { schema: ProblemDetailsSchema } },
        },
        ValidationError: {
          description: 'バリデーションエラー',
          content: { 'application/problem+json': { schema: ProblemDetailsSchema } },
        },
        NotFound: {
          description: '対象が見つかりません',
          content: { 'application/problem+json': { schema: ProblemDetailsSchema } },
        },
        BadRequest: {
          description: '不正なリクエスト',
          content: { 'application/problem+json': { schema: ProblemDetailsSchema } },
        },
        InternalError: {
          description: 'サーバ内部エラー',
          content: { 'application/problem+json': { schema: ProblemDetailsSchema } },
        },
      },
      schemas: {
        ApiError: ApiErrorSchema,
        ErrorResponse: ErrorResponseSchema,
        ApiMeta: ApiMetaSchema,
        ProblemDetails: ProblemDetailsSchema,
        Owner: OwnerResponseSchema,
        Loan: LoanResponseSchema,
        Property: PropertyResponseSchema,
        Expense: ExpenseResponseSchema,
        RentRoll: RentRollResponseSchema,
        User: UserResponseSchema,
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      ...ownersPaths,
      ...loansPaths,
      ...propertiesPaths,
      ...expensesPaths,
      ...rentRollsPaths,
      ...usersPaths,
    },
    tags: [
      { name: 'Owners', description: '所有者管理API' },
      { name: 'Loans', description: '借入管理API' },
      { name: 'Properties', description: '物件管理API' },
      { name: 'Expenses', description: '支出管理API' },
      { name: 'RentRolls', description: 'レントロール管理API' },
      { name: 'Users', description: 'ユーザー管理API' },
    ],
  });
}
