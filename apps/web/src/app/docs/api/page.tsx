'use client';

import React from 'react';

export default function ApiDocsPage() {
  return (
    <div style={{ height: '100vh' }}>
      <iframe
        src="/swagger/index.html"
        title="API Docs"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
