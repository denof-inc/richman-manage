import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const content = `import createClient from 'openapi-fetch'
import type { paths } from './schema'

export const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '' })
`;

const outPath = resolve(__dirname, '../packages/generated/client.ts');
writeFileSync(outPath, content);
