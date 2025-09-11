/**
 * @jest-environment node
 */
import { generateOpenAPIDoc } from '@/lib/api/openapi/document';

describe('OpenAPI (Zod-first)', () => {
  it('generates 3.1 doc with core components and paths', async () => {
    const spec = generateOpenAPIDoc() as unknown as {
      openapi: string;
      components?: {
        securitySchemes?: Record<string, unknown>;
        responses?: Record<string, unknown>;
        parameters?: Record<string, unknown>;
      };
      tags?: Array<{ name: string }>;
      paths?: Record<string, unknown>;
    };
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.components?.securitySchemes).toHaveProperty('BearerAuth');
    const tagNames = (spec.tags ?? []).map((t) => t.name);
    expect(tagNames).toEqual(expect.arrayContaining(['Owners', 'Loans']));
    const paths = Object.keys(spec.paths ?? {});
    expect(paths).toEqual(expect.arrayContaining(['/api/owners', '/api/loans']));

    // $refでの共通化（responses/parameters）が存在すること
    expect(spec.components?.responses).toHaveProperty('Unauthorized');
    expect(spec.components?.responses).toHaveProperty('ValidationError');
    expect(spec.components?.parameters).toHaveProperty('PageParam');
    expect(spec.components?.parameters).toHaveProperty('LimitParam');

    // loans detail endpoints
    const loanDetail = (spec.paths as Record<string, unknown>)['/api/loans/{id}'] as
      | Record<string, unknown>
      | undefined;
    expect(loanDetail).toBeTruthy();
    const ops = loanDetail as { get?: unknown; put?: unknown; delete?: unknown };
    expect(ops.get).toBeTruthy();
    expect(ops.put).toBeTruthy();
    expect(ops.delete).toBeTruthy();
  });
});
