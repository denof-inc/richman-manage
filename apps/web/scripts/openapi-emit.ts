import { writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOpenAPIDoc } from '@/lib/api/openapi/document';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  const doc = generateOpenAPIDoc();
  const outPath = resolve(__dirname, '../../..', 'packages/generated/openapi.json');
  const outDir = dirname(outPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // keep previous
  const prevPath = resolve(outDir, 'prev.json');
  if (existsSync(outPath)) {
    try {
      copyFileSync(outPath, prevPath);
    } catch {}
  }

  writeFileSync(outPath, JSON.stringify(doc, null, 2));
  // eslint-disable-next-line no-console
  console.log(`OpenAPI emitted to ${outPath}`);
}

main();
