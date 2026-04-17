import fs from 'fs';
import path from 'path';

describe('remotion video import boundary', () => {
  it('uses the lambda client for runtime render kickoff and polling helpers', () => {
    const sourcePath = path.join(process.cwd(), 'src/ai/generators/remotion-video.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("from '@remotion/lambda/client'");
    expect(source).toContain('export async function startRemotionVideoRender');
    expect(source).toContain('export async function getRemotionVideoRenderStatus');
  });

  it('bundles remotion with the CI-aware wrapper before Next.js build runs', () => {
    const bundleScriptPath = path.join(process.cwd(), 'scripts/bundle-remotion.mjs');
    const bundleScript = fs.readFileSync(bundleScriptPath, 'utf8');
    const ciBundleScript = fs.readFileSync(
      path.join(process.cwd(), 'scripts/ci-remotion-bundle.mjs'),
      'utf8',
    );
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
    };

    expect(bundleScript).toContain('@remotion/bundler');
    expect(ciBundleScript).toContain('node scripts/bundle-remotion.mjs');
    expect(packageJson.scripts['remotion:bundle']).toContain('bundle-remotion.mjs');
    expect(packageJson.scripts.build).toContain('ci-remotion-bundle.mjs');
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

