/**
 * Unit Tests: AI Model Configuration
 *
 * Tests to verify correct Gemini 3 model assignments for cost optimization:
 * - Flash models for simple queries (cost-efficient)
 * - Pro models for complex/tool-use tasks
 * - Pro Image for image generation
 */

import * as fs from 'fs';
import * as path from 'path';

describe('AI Model Configuration', () => {
  const srcDir = path.join(process.cwd(), 'src', 'ai');

  describe('Default Model (genkit.ts)', () => {
    it('should use Gemini 3 Flash for cost efficiency', () => {
      const content = fs.readFileSync(path.join(srcDir, 'genkit.ts'), 'utf-8');
      expect(content).toContain("model: 'googleai/gemini-3-flash-preview'");
    });
  });

  describe('Chat Query Handler', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(path.join(srcDir, 'chat-query-handler.ts'), 'utf-8');
    });

    it('should use Gemini 3 Flash for query analysis (cost-efficient)', () => {
      // The analyzeQueryPrompt should use Flash
      expect(content).toContain("model: 'googleai/gemini-3-flash-preview'");
    });

    it('should not use expensive Pro models for simple queries', () => {
      // Pro should NOT be used in chat-query-handler
      expect(content).not.toContain("model: 'googleai/gemini-3-pro-preview'");
    });
  });

  describe('Product Recommendations', () => {
    it('should use Gemini 3 Flash (simple selection task)', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'ai-powered-product-recommendations.ts'),
        'utf-8'
      );
      expect(content).toContain("model: 'googleai/gemini-3-flash-preview'");
    });
  });

  describe('Marketing Agent (Craig)', () => {
    it('should use Gemini 3 Pro for complex content generation', () => {
      const content = fs.readFileSync(path.join(srcDir, 'marketing-agent.ts'), 'utf-8');
      expect(content).toContain("model: 'googleai/gemini-3-pro-preview'");
    });
  });

  describe('Image Generation', () => {
    it('should use Nano Banana Pro (Gemini 3 Pro Image) for high-quality images', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'flows', 'generate-social-image.ts'),
        'utf-8'
      );
      expect(content).toContain("model: 'googleai/gemini-3-pro-image-preview'");
    });
  });

  describe('Video Generation', () => {
    it('should use Veo 3.1 for marketing videos', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'flows', 'generate-video.ts'),
        'utf-8'
      );
      expect(content).toContain("model: 'googleai/veo-3.1-generate-preview'");
    });
  });

  describe('Cost Optimization Strategy', () => {
    it('should have more Flash usages than Pro usages', () => {
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
        flashCount += (content.match(/gemini-3-flash-preview/g) || []).length;
        proCount += (content.match(/gemini-3-pro-preview/g) || []).length;
      }

      // Flash should be used more than Pro for cost optimization
      expect(flashCount).toBeGreaterThan(proCount);
    });
  });
});

describe('Model ID Format', () => {
  it('should use correct googleai prefix format', () => {
    const genkit = fs.readFileSync(
      path.join(process.cwd(), 'src', 'ai', 'genkit.ts'),
      'utf-8'
    );
    // All models should use the googleai/ prefix
    expect(genkit).toMatch(/model:\s*['"]googleai\//);
  });

  it('should use preview versions for Gemini 3 models', () => {
    const files = [
      'src/ai/genkit.ts',
      'src/ai/chat-query-handler.ts',
      'src/ai/marketing-agent.ts',
      'src/ai/flows/generate-social-image.ts',
    ];

    for (const file of files) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      // If using gemini-3, should have -preview suffix
      if (content.includes('gemini-3-')) {
        expect(content).toMatch(/gemini-3-[a-z-]+-preview/);
      }
    }
  });
});
