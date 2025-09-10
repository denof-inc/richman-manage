import { createDocument } from 'zod-openapi';
import { ownersPaths } from '@/lib/api/openapi/paths/owners.paths';
import { loansPaths } from '@/lib/api/openapi/paths/loans.paths';

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
