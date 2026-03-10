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

function readAgentSource(fileName: (typeof AGENT_FILES)[number]): string {
  const filePath = path.join(process.cwd(), 'src/server/agents', fileName);
  return fs.readFileSync(filePath, 'utf8');
}

describe('agent merge-resolution guards', () => {
  it.each(AGENT_FILES)('%s contains no unresolved merge markers', (fileName) => {
    const source = readAgentSource(fileName);

    expect(source).not.toMatch(/^<<<<<<< /m);
    expect(source).not.toMatch(/^=======$/m);
    expect(source).not.toMatch(/^>>>>>>> /m);
  });

  it.each(AGENT_FILES)('%s wires semantic search tools through semanticSearchEntityId', (fileName) => {
    const source = readAgentSource(fileName);

    expect(source).toContain('const semanticSearchEntityId =');
    expect(source).toContain('makeSemanticSearchToolsImpl(semanticSearchEntityId)');
  });

  it.each([
    'executive.ts',
    'glenda.ts',
    'jack.ts',
    'leo.ts',
  ] as const)('%s does not regress to local brandId fallback in act()', (fileName) => {
    const source = readAgentSource(fileName);

    const actPreamble = source.match(/async\s+act\([\s\S]*?if \(targetId === 'user_request' && stimulus\) {/m)?.[0] ?? '';
    expect(actPreamble).not.toContain("const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';");
  });

  it('mrsParker does not regress to local orgId fallback in act()', () => {
    const source = readAgentSource('mrsParker.ts');

    const actPreamble = source.match(/async\s+act\([\s\S]*?if \(targetId === 'user_request' && stimulus\) {/m)?.[0] ?? '';
    expect(actPreamble).not.toContain("const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || 'unknown';");
  });

  it('dayday keeps typed tools signature in act()', () => {
    const source = readAgentSource('dayday.ts');

    expect(source).toContain('async act(brandMemory, agentMemory, targetId, tools: DayDayTools, stimulus?: string)');
  });

  it('executive keeps typed tools signature in act()', () => {
    const source = readAgentSource('executive.ts');

    expect(source).toContain('async act(brandMemory, agentMemory, targetId, tools: ExecutiveTools, stimulus?: string)');
  });
});
