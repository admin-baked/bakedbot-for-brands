import fs from 'fs';
import path from 'path';

describe('remotion video import boundary', () => {
  it('keeps runtime remotion packages behind webpackIgnore imports', () => {
    const sourcePath = path.join(process.cwd(), 'src/ai/generators/remotion-video.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toMatch(/webpackIgnore:\s*true[\s\S]*@remotion\/renderer/);
    expect(source).toMatch(/webpackIgnore:\s*true[\s\S]*@remotion\/bundler/);
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
