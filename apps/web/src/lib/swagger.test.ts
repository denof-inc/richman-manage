/**
 * @jest-environment node
 */
import { getApiDocs } from '@/lib/swagger';

interface AnySpec {
  openapi?: string;
  components?: Record<string, unknown>;
  tags?: Array<{ name: string }>;
  paths?: Record<string, unknown>;
}

describe('Swagger spec', () => {
  it('includes standard components and tags', async () => {
    const spec = (await getApiDocs()) as AnySpec;

    // basic
    expect(spec).toHaveProperty('openapi', '3.0.0');
    expect(spec).toHaveProperty('paths');

    // security schemes
    expect(spec.components?.securitySchemes).toHaveProperty('bearerAuth');

    // common schemas / responses / parameters (will be added in swagger.ts)
    expect(spec.components?.schemas).toHaveProperty('ErrorResponse');
    expect(spec.components?.schemas).toHaveProperty('ApiError');
    expect(spec.components?.schemas).toHaveProperty('Meta');
    expect(spec.components?.responses).toHaveProperty('Unauthorized');
    expect(spec.components?.responses).toHaveProperty('ValidationError');
    expect(spec.components?.parameters).toHaveProperty('PageParam');
    expect(spec.components?.parameters).toHaveProperty('LimitParam');

    // tags
    const tagNames = (spec.tags || []).map((t) => t.name);
    expect(tagNames).toEqual(expect.arrayContaining(['Loans', 'Properties', 'Owners']));

    // at least key API paths exist
    const pathKeys = Object.keys(spec.paths || {});
    expect(pathKeys.length).toBeGreaterThan(0);
    expect(pathKeys).toEqual(expect.arrayContaining(['/api/owners']));
  });
});
