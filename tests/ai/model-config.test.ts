/**
 * Unit Tests: AI Model Configuration
 */

import * as fs from 'fs';
import * as path from 'path';

describe('AI Model Configuration', () => {
  const srcDir = path.join(process.cwd(), 'src', 'ai');

  describe('Default Model (genkit.ts)', () => {
    it('should use a Gemini model for cost efficiency', () => {
      const content = fs.readFileSync(path.join(srcDir, 'genkit.ts'), 'utf-8');
      expect(content).toMatch(/model:\s*['"]googleai\/gemini/);
    });
  });

  describe('Chat Query Handler', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(path.join(srcDir, 'chat-query-handler.ts'), 'utf-8');
    });

    it('should use Gemini 3 Flash for query analysis (cost-efficient)', () => {
      expect(content).toContain("model: 'googleai/gemini-3-flash-preview'");
    });

    it('should not use expensive Pro models for simple queries', () => {
      expect(content).not.toContain("model: 'googleai/gemini-3-pro-preview'");
    });
  });

  describe('Product Recommendations', () => {
    it('should use a Gemini Flash model (simple selection task)', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'ai-powered-product-recommendations.ts'),
        'utf-8'
      );
      expect(content).toMatch(/googleai\/gemini.*flash/);
    });
  });

  describe('Marketing Agent (Craig)', () => {
    it('should use Gemini 3 Pro for complex content generation', () => {
      const content = fs.readFileSync(path.join(srcDir, 'marketing-agent.ts'), 'utf-8');
      expect(content).toContain("model: 'googleai/gemini-3-pro-preview'");
    });
  });

  describe('Image Generation', () => {
    it('should define a Pro image model for high-quality images', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'flows', 'generate-social-image.ts'),
        'utf-8'
      );
      expect(content).toMatch(/googleai\/gemini.*image/);
    });
  });

  describe('Video Generation', () => {
    it('should reference a video generation model', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'flows', 'generate-video.ts'),
        'utf-8'
      );
      expect(content).toMatch(/sora|veo|video/i);
    });
  });

  describe('Cost Optimization Strategy', () => {
    it('should have more Flash usages than Pro usages across key files', () => {
      const files = [
        'genkit.ts',
        'chat-query-handler.ts',
        'ai-powered-product-recommendations.ts',
        'marketing-agent.ts',
      ];

      let flashCount = 0;
      let proCount = 0;

      for (const file of files) {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
        flashCount += (content.match(/flash/gi) || []).length;
        proCount += (content.match(/gemini-3-pro-preview/g) || []).length;
      }

      expect(flashCount).toBeGreaterThan(proCount);
    });
  });
});

describe('Model ID Format', () => {
  it('should use correct googleai prefix format in genkit.ts', () => {
    const genkit = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'genkit.ts'),
      'utf-8'
    );
    expect(genkit).toMatch(/model:\s*['"]googleai\//);
  });

  it('should use preview versions for Gemini 3 models', () => {
    const files = [
      'src/ai/chat-query-handler.ts',
      'src/ai/marketing-agent.ts',
      'src/ai/flows/generate-social-image.ts',
    ];

    for (const file of files) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      if (content.includes('gemini-3-')) {
        expect(content).toMatch(/gemini-3-[a-z-]+-preview/);
      }
    }
  });
});
