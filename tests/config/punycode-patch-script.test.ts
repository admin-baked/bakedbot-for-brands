import fs from 'fs';
import path from 'path';

describe('punycode deprecation patching', () => {
  it('runs the node_modules patcher during postinstall', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.postinstall).toBe('node scripts/patch-punycode-deprecation.mjs');
  });

  it('patch script targets the known deprecated punycode imports', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/patch-punycode-deprecation.mjs');
    const source = fs.readFileSync(scriptPath, 'utf8');

    expect(source).toContain('require("punycode/")');
    expect(source).toContain('from "punycode/"');
    expect(source).toContain("packageJson.version !== '0.0.3'");
    expect(source).toContain("packageJson.name !== whatwgUrlPackageName");
    expect(source).toContain("packageJson.version !== '5.0.0'");
    expect(source).toContain("path.join(packageDir, 'lib', 'url-state-machine.js')");
  });
});
