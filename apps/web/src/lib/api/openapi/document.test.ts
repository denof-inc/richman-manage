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
    expect(tagNames).toEqual(
      expect.arrayContaining(['Owners', 'Loans', 'Properties', 'Expenses', 'RentRolls', 'Users'])
    );
    const paths = Object.keys(spec.paths ?? {});
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/owners',
        '/api/loans',
        '/api/properties',
        '/api/expenses',
        '/api/rent-rolls',
        '/api/users',
      ])
    );

    // $refでの共通化（responses/parameters）が存在すること
    expect(spec.components?.responses).toHaveProperty('Unauthorized');
    expect(spec.components?.responses).toHaveProperty('ValidationError');
    expect(spec.components?.parameters).toHaveProperty('PageParam');
    expect(spec.components?.parameters).toHaveProperty('LimitParam');
    // responses use problem+json for 4xx/5xx
    const responses = spec.components?.responses as
      | Record<string, { content?: Record<string, unknown> }>
      | undefined;
    const una = responses?.['Unauthorized'];
    expect(una?.content).toHaveProperty('application/problem+json');

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

  it('ensures every operationId exists and is unique; and responses reuse components via $ref', () => {
    type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head' | 'trace';
    type ResponseObj = { $ref?: string; description?: string; content?: unknown };
    type Operation = { operationId?: string; responses?: Record<string, ResponseObj> };
    type PathItem = Partial<Record<HttpMethod, Operation>>;
    type Spec = { paths?: Record<string, PathItem> };

    const spec = generateOpenAPIDoc() as unknown as Spec;

    const seen = new Set<string>();
    const methods: ReadonlyArray<HttpMethod> = [
      'get',
      'put',
      'post',
      'delete',
      'patch',
      'options',
      'head',
      'trace',
    ];
    for (const item of Object.values(spec.paths ?? {})) {
      for (const m of methods) {
        const op = item[m];
        if (!op) continue;
        // operationId must exist and be unique
        expect(op.operationId).toBeTruthy();
        const id = op.operationId as string;
        expect(seen.has(id)).toBe(false);
        seen.add(id);

        // at least one response should reuse components via $ref
        const responses = op.responses ?? {};
        const hasRef = Object.values(responses).some((r) => typeof r?.$ref === 'string');
        expect(hasRef).toBe(true);
      }
    }
  });
});
