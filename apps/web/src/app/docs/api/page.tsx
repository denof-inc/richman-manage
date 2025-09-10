'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { ApiReference } from '@scalar/nextjs-api-reference';

export default function ApiDocsPage() {
  return (
    <div style={{ height: '100vh' }}>
      <ApiReference
        theme="default"
        layout="modern"
        configuration={{
          spec: { url: '/api/openapi' },
          hideDownloadButton: false,
          withFonts: true,
        }}
      />
    </div>
  );
}
