import fs from 'fs';
import path from 'path';

describe('remotion video route boundaries', () => {
  it('keeps the start route authenticated and delegates render kickoff to the Remotion helper', () => {
    const sourcePath = path.join(process.cwd(), 'src/app/api/ai/video/remotion/start/route.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("import { requireUser } from '@/server/auth/auth'");
    expect(source).toContain("import { startRemotionVideoRender } from '@/ai/generators/remotion-video'");
    expect(source).toContain("return NextResponse.json({ error: 'Video prompt is required' }, { status: 400 });");
  });

  it('keeps the status route authenticated and delegates polling to the Remotion helper', () => {
    const sourcePath = path.join(process.cwd(), 'src/app/api/ai/video/remotion/status/route.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("import { requireUser } from '@/server/auth/auth'");
    expect(source).toContain("import { getRemotionVideoRenderStatus } from '@/ai/generators/remotion-video'");
    expect(source).toContain("return NextResponse.json({ error: 'Render ID is required' }, { status: 400 });");
  });
});
