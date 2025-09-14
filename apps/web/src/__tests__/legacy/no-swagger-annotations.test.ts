/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

describe('Legacy Swagger annotations are not used', () => {
  const targetDir = path.join(__dirname, '..', '..', 'app', 'api');

  function collectFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...collectFiles(p));
      else if (e.isFile() && /\.(ts|tsx|js|jsx)$/.test(e.name)) files.push(p);
    }
    return files;
  }

  it('does not contain @swagger in route handlers', () => {
    const files = collectFiles(targetDir);
    const offenders = files.filter((f) => fs.readFileSync(f, 'utf8').includes('@swagger'));
    expect(offenders).toEqual([]);
  });
});
