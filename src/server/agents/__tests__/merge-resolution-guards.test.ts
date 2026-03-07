import fs from 'node:fs';
import path from 'node:path';

const AGENT_FILES = [
  'dayday.ts',
  'executive.ts',
  'glenda.ts',
  'jack.ts',
  'leo.ts',
  'mrsParker.ts',
] as const;

describe('agent merge-resolution guards', () => {
  it.each(AGENT_FILES)('%s contains no unresolved merge markers', (fileName) => {
    const filePath = path.join(process.cwd(), 'src/server/agents', fileName);
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).not.toMatch(/^<<<<<<< /m);
    expect(source).not.toMatch(/^=======$/m);
    expect(source).not.toMatch(/^>>>>>>> /m);
  });

  it.each(AGENT_FILES)('%s wires semantic search tools through semanticSearchEntityId', (fileName) => {
    const filePath = path.join(process.cwd(), 'src/server/agents', fileName);
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('const semanticSearchEntityId =');
    expect(source).toContain('makeSemanticSearchToolsImpl(semanticSearchEntityId)');
  });

  it('dayday uses typed tools and semanticSearchEntityId in act()', () => {
    const filePath = path.join(process.cwd(), 'src/server/agents', 'dayday.ts');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('async act(brandMemory, agentMemory, targetId, tools: DayDayTools, stimulus?: string)');
    expect(source).toContain('const semanticSearchEntityId =');
    expect(source).not.toContain("const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';");
  });
});
