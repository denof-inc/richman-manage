import { ApiReference } from '@scalar/nextjs-api-reference';

export const dynamic = 'force-dynamic';

export const GET = ApiReference({
  theme: 'default',
  layout: 'modern',
  spec: { url: '/api/openapi' },
  hideDownloadButton: false,
  withFonts: true,
});
