import fs from 'fs';
import path from 'path';

describe('wallet token route boundary', () => {
  it('keeps pass-token helpers outside Next route modules', () => {
    const tokenRoutePath = path.join(
      process.cwd(),
      'src/app/api/wallet/token/route.ts'
    );
    const passRoutePath = path.join(
      process.cwd(),
      'src/app/api/wallet/pass/route.ts'
    );
    const lookupRoutePath = path.join(
      process.cwd(),
      'src/app/api/wallet/lookup-token/route.ts'
    );

    const tokenRouteSource = fs.readFileSync(tokenRoutePath, 'utf8');
    const passRouteSource = fs.readFileSync(passRoutePath, 'utf8');
    const lookupRouteSource = fs.readFileSync(lookupRoutePath, 'utf8');

    expect(tokenRouteSource).not.toContain('export function buildPassToken');
    expect(tokenRouteSource).not.toContain('export function verifyPassToken');
    expect(passRouteSource).toContain("@/server/services/wallet/pass-token");
    expect(lookupRouteSource).toContain("@/server/services/wallet/pass-token");
    expect(passRouteSource).not.toContain("../token/route");
    expect(lookupRouteSource).not.toContain("../token/route");
  });
});
