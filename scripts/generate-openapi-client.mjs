import { writeFileSync } from 'node:fs'

const content = `import createClient from 'openapi-fetch'
import type { paths } from './schema'

export const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '' })
`;

writeFileSync('packages/generated/client.ts', content);
