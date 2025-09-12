import { ApiReference } from '@scalar/nextjs-api-reference';

export const dynamic = 'force-dynamic';

export const GET = ApiReference({
  theme: 'default',
  layout: 'modern',
  url: '/api/openapi',
  pageTitle: 'RichmanManage API Docs',
});
