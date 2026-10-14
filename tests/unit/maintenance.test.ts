import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Production connects with `autoIndex` off: a model left out of
 * syncAllIndexes gets none of its indexes there — unique ones included.
 */
describe('syncAllIndexes covers every model', () => {
  const root = path.resolve(__dirname, '../..');
  const source = readFileSync(path.join(root, 'lib/db/repositories/maintenance.ts'), 'utf8');
  const models = readdirSync(path.join(root, 'lib/db/models')).filter((file) => file.endsWith('.ts'));

  it.each(models)('%s', (file) => {
    const name = file.replace(/\.ts$/, '');
    const imported = new RegExp(`import \\{ (\\w+Model) \\} from '@/lib/db/models/${name}';`).exec(source);
    expect(imported, `lib/db/models/${name} is not imported`).not.toBeNull();
    expect(source).toMatch(new RegExp(`^\\s+${imported![1]},$`, 'm'));
  });
});
