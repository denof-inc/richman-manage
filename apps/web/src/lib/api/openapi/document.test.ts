/**
 * @jest-environment node
 */
import { generateOpenAPIDoc } from '@/lib/api/openapi/document';

describe('OpenAPI (Zod-first)', () => {
  it('generates 3.1 doc with core components and paths', async () => {
    const spec = generateOpenAPIDoc() as unknown as {
      openapi: string;
      components?: { securitySchemes?: Record<string, unknown> };
      tags?: Array<{ name: string }>;
      paths?: Record<string, unknown>;
    };
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.components?.securitySchemes).toHaveProperty('BearerAuth');
    const tagNames = (spec.tags ?? []).map((t) => t.name);
    expect(tagNames).toEqual(expect.arrayContaining(['Owners', 'Loans']));
    const paths = Object.keys(spec.paths ?? {});
    expect(paths).toEqual(expect.arrayContaining(['/api/owners', '/api/loans']));
  });
});
