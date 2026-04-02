import fs from 'fs';
import path from 'path';

describe('Creative Center video invocation boundary', () => {
  it('uses the API route instead of importing the video server action into the client page', () => {
    const sourcePath = path.join(process.cwd(), 'src/app/dashboard/creative/page.tsx');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("fetch('/api/ai/video'");
    expect(source).not.toContain('import { generateMarketingVideo } from "@/ai/flows/generate-video";');
  });
});
