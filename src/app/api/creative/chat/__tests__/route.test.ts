import fs from 'fs';
import path from 'path';

describe('creative chat route Claude client wiring', () => {
  it('reuses the canonical Claude client instead of local Anthropic env config', () => {
    const sourcePath = path.join(process.cwd(), 'src/app/api/creative/chat/route.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("import { getClaudeClient } from '@/ai/claude'");
    expect(source).toContain('const client = getClaudeClient();');
    expect(source).not.toContain("@anthropic-ai/sdk");
    expect(source).not.toContain('ANTHROPIC_API_KEY');
  });
});
