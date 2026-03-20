import fs from 'fs';
import path from 'path';

describe('logger import boundary', () => {
  it('keeps Google Cloud Logging behind a webpackIgnore import', () => {
    const sourcePath = path.join(process.cwd(), 'src/lib/logger.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toMatch(/webpackIgnore:\s*true[\s\S]*@google-cloud\/logging/);
  });
});
