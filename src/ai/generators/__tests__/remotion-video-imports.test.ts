import fs from 'fs';
import path from 'path';

describe('remotion video import boundary', () => {
  it('keeps runtime remotion packages behind webpackIgnore imports', () => {
    const sourcePath = path.join(process.cwd(), 'src/ai/generators/remotion-video.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toMatch(/webpackIgnore:\s*true[\s\S]*@remotion\/renderer/);
    expect(source).toContain('npm run remotion:bundle');
  });

  it('bundles remotion at build time before Next.js build runs', () => {
    const bundleScriptPath = path.join(process.cwd(), 'scripts/bundle-remotion.mjs');
    const bundleScript = fs.readFileSync(bundleScriptPath, 'utf8');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
    };

    expect(bundleScript).toContain('@remotion/bundler');
    expect(packageJson.scripts['remotion:bundle']).toContain('bundle-remotion.mjs');
    expect(packageJson.scripts.build).toContain('remotion:bundle');
  });

  it('marks slideshow props as serializable input props for the renderer', () => {
    const sourcePath = path.join(
      process.cwd(),
      'src/remotion/compositions/BrandedSlideshow.tsx'
    );
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain(
      'export interface BrandedSlideshowProps extends Record<string, unknown>'
    );
  });
});
