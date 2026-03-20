import fs from 'fs';
import path from 'path';

describe('apple wallet import boundary', () => {
  it('keeps the optional APNs dependency behind a webpackIgnore import', () => {
    const sourcePath = path.join(
      process.cwd(),
      'src/server/services/wallet/apple-wallet.ts'
    );
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toMatch(/webpackIgnore:\s*true[\s\S]*@parse\/node-apn/);
  });
});
