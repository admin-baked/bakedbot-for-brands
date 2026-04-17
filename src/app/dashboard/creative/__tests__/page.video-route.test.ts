import fs from 'fs';
import path from 'path';

describe('Creative Center video invocation boundary', () => {
  it('uses the API route instead of importing the video server action into the client page', () => {
    const sourcePath = path.join(process.cwd(), 'src/app/dashboard/creative/page.tsx');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("fetch('/api/ai/video'");
    expect(source).toContain("fetch('/api/ai/video/remotion/start'");
    expect(source).toContain("fetch('/api/ai/video/remotion/status'");
    expect(source).not.toContain('import { generateMarketingVideo } from "@/ai/flows/generate-video";');
  });

  it('scopes org presets and advanced media modes by user role', () => {
    const sourcePath = path.join(process.cwd(), 'src/app/dashboard/creative/page.tsx');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("const visibleOrgPresets = isSuperUser");
    expect(source).toContain("const availableMediaModes = isSuperUser ? SUPER_USER_MEDIA_MODES : STANDARD_MEDIA_MODES;");
    expect(source).toContain("const visibleQuickStarts = QUICK_STARTS.filter((quickStart) => isSuperUser || quickStart.businessContext !== 'company');");
  });
});
