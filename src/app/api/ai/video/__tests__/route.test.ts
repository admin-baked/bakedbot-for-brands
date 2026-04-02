import fs from 'fs';
import path from 'path';

describe('video generation route boundary', () => {
  it('keeps Creative Center video generation behind the authenticated API route', () => {
    const sourcePath = path.join(process.cwd(), 'src/app/api/ai/video/route.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("import { requireUser } from '@/server/auth/auth'");
    expect(source).toContain("import { generateMarketingVideo } from '@/ai/flows/generate-video'");
    expect(source).toContain("return NextResponse.json({ error: 'Video prompt is required' }, { status: 400 });");
    expect(source).toContain("return NextResponse.json({ error: message }, { status: 500 });");
  });
});
