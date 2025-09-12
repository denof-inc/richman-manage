/**
 * @jest-environment node
 */
import { generateOpenAPIDoc } from '@/lib/api/openapi/document';

describe('OpenAPI (Zod-first) - legacy test migrated', () => {
  it('has 3.1.0 openapi and basic tags/paths', () => {
    const spec = generateOpenAPIDoc() as unknown as {
      openapi?: string;
      components?: {
        securitySchemes?: Record<string, unknown>;
        parameters?: Record<string, unknown>;
        responses?: Record<string, unknown>;
      };
      tags?: Array<{ name: string }>;
      paths?: Record<string, unknown>;
    };
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths).toBeTruthy();

    // security schemes (BearerAuth) and common components exist
    expect(spec.components?.securitySchemes).toHaveProperty('BearerAuth');
    expect(spec.components?.responses).toHaveProperty('Unauthorized');
    expect(spec.components?.responses).toHaveProperty('ValidationError');
    expect(spec.components?.parameters).toHaveProperty('PageParam');
    expect(spec.components?.parameters).toHaveProperty('LimitParam');

    // tags include Owners/Loans
    const tagNames = (spec.tags || []).map((t) => t.name);
    expect(tagNames).toEqual(expect.arrayContaining(['Loans', 'Owners']));

    // key path exists
    const pathKeys = Object.keys(spec.paths || {});
    expect(pathKeys).toEqual(expect.arrayContaining(['/api/owners', '/api/loans']));
  });
});
