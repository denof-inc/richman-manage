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
      },
      security: [{ bearerAuth: [] }],
    },
  });
  return spec;
}
