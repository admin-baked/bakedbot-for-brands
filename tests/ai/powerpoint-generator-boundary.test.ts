import fs from 'fs';
import path from 'path';

describe('powerpoint generator boundary', () => {
  it('uses the standard GLM tier for deck scripting and keeps user-safe metadata', () => {
    const sourcePath = path.join(process.cwd(), 'src/ai/generators/powerpoint.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('const DECK_SCRIPT_MODEL = GLM_MODELS.STANDARD;');
    expect(source).toContain("generatedBy: 'deck-builder'");
    expect(source).not.toContain('model: GLM_MODELS.STRATEGIC');
  });
});
