/**
 * @jest-environment jsdom
 */
import { request } from '@/lib/api/client';
import { z } from 'zod';

describe('api/client request', () => {
  beforeEach(() => {
    // @ts-expect-error override
    global.fetch = jest.fn();
  });

  it('unwraps success envelope', async () => {
    // @ts-expect-error override
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, data: { x: 1 }, error: null }),
    });

    const schema = z.object({ x: z.number() });
    const res = await request('/api/test', schema);
    expect(res.data.x).toBe(1);
  });

  it('throws on error envelope', async () => {
    // @ts-expect-error override
    global.fetch.mockResolvedValue({
      ok: false,
      text: async () =>
        JSON.stringify({ success: false, data: null, error: { code: 'X', message: 'boom' } }),
    });

    const schema = z.object({ x: z.number() });
    await expect(request('/api/test', schema)).rejects.toThrow('X: boom');
  });
});
