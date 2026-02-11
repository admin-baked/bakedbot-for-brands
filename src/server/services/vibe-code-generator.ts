/**
 * Vibe Code Generator
 *
 * Generates complete Next.js applications from vibe configurations.
 * Uses Claude Sonnet 4.5 to create React components, Tailwind config, and styles.
 */

import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';
import type { VibeConfig } from '@/types/vibe';
import type { VibeCodeFile, VibeCodeProject, VibeCodeGenerationResult } from '@/types/vibe-code';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `You are an expert Next.js developer specializing in creating beautiful, production-ready cannabis dispensary websites.

When given a vibe configuration (theme, colors, typography), you generate:
1. A complete Next.js 15 app using App Router
2. Tailwind CSS with custom theme configuration
3. Reusable React components (ProductCard, Header, Footer)
4. Sample product data for demonstrations
5. Responsive, mobile-first design

IMPORTANT RULES:
- Use TypeScript for all files
- Use Tailwind CSS (no inline styles)
- Use Next.js 15 App Router patterns
- Include proper TypeScript types
- Add helpful comments
- Make it production-ready

Output your response in this JSON format:
{
  "files": [
    {"path": "app/page.tsx", "content": "...", "language": "typescript"},
    {"path": "components/product-card.tsx", "content": "...", "language": "typescript"},
    ...
  ],
  "dependencies": {
    "next": "15.0.0",
    "react": "^19.0.0",
    ...
  },
  "reasoning": "Brief explanation of your design choices"
}`;

function generateUserPrompt(vibeConfig: Partial<VibeConfig>, prompt: string): string {
  return `Generate a complete Next.js cannabis dispensary website based on this vibe:

**Original Prompt**: ${prompt}

**Vibe Name**: ${vibeConfig.name}
**Description**: ${vibeConfig.description}

**Theme Colors**:
- Primary: ${vibeConfig.theme?.colors?.primary}
- Secondary: ${vibeConfig.theme?.colors?.secondary}
- Accent: ${vibeConfig.theme?.colors?.accent}
- Background: ${vibeConfig.theme?.colors?.background}

**Typography**:
- Heading Font: ${vibeConfig.theme?.typography?.headingFont || 'Inter'}
- Body Font: ${vibeConfig.theme?.typography?.bodyFont || 'Inter'}

**Components Needed**:
1. app/page.tsx - Homepage with hero section and product grid
2. components/product-card.tsx - Reusable product card
3. components/header.tsx - Site header with navigation
4. components/footer.tsx - Site footer
5. app/globals.css - Global styles and Tailwind directives
6. tailwind.config.ts - Tailwind configuration with theme colors
7. app/layout.tsx - Root layout with font imports
8. lib/products.ts - Sample product data (6-8 cannabis products)

Make the design match the vibe's aesthetic. Use the exact colors provided.
Include hover effects, animations, and micro-interactions.
Add cannabis emoji and personality throughout.`;
}

interface ClaudeCodeResponse {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  dependencies: Record<string, string>;
  reasoning?: string;
}

export async function generateVibeCode(
  vibeConfig: Partial<VibeConfig>,
  prompt: string
): Promise<VibeCodeGenerationResult> {
  try {
    logger.info('[VIBE-CODE-GEN] Starting code generation', {
      vibeName: vibeConfig.name,
      prompt: prompt.substring(0, 50),
    });

    const response = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: generateUserPrompt(vibeConfig, prompt),
      temperature: 0.7,
      maxTokens: 8000,
      model: 'claude-sonnet-4-5-20250929',
    });

    // Parse JSON from response
    let parsed: ClaudeCodeResponse;
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('[VIBE-CODE-GEN] Failed to parse AI response', {
        response: response.substring(0, 500),
        error: parseError,
      });
      return {
        success: false,
        error: 'Failed to parse generated code. Please try again.',
      };
    }

    // Validate response structure
    if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
      return {
        success: false,
        error: 'Invalid code generation response - no files generated',
      };
    }

    // Create project structure
    const project: VibeCodeProject = {
      id: uuidv4(),
      name: vibeConfig.name || 'My Dispensary',
      description: vibeConfig.description || prompt,
      files: parsed.files.map((f) => ({
        path: f.path,
        content: f.content,
        language: f.language as any,
      })),
      dependencies: parsed.dependencies || getDefaultDependencies(),
      vibeConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add package.json if not present
    if (!project.files.find((f) => f.path === 'package.json')) {
      project.files.push({
        path: 'package.json',
        content: generatePackageJson(project.name, project.dependencies),
        language: 'json',
      });
    }

    // Add README.md
    project.files.push({
      path: 'README.md',
      content: generateReadme(project.name, project.description),
      language: 'html',
    });

    logger.info('[VIBE-CODE-GEN] Code generation successful', {
      projectId: project.id,
      fileCount: project.files.length,
    });

    return {
      success: true,
      project,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    logger.error('[VIBE-CODE-GEN] Code generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to generate code. Please try again.',
    };
  }
}

function getDefaultDependencies(): Record<string, string> {
  return {
    next: '15.0.0',
    react: '^19.0.0',
    'react-dom': '^19.0.0',
    typescript: '^5.0.0',
    '@types/node': '^20.0.0',
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    tailwindcss: '^3.4.0',
    postcss: '^8.4.0',
    autoprefixer: '^10.4.0',
    'lucide-react': '^0.292.0',
  };
}

function generatePackageJson(name: string, dependencies: Record<string, string>): string {
  return JSON.stringify(
    {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies,
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        eslint: '^8.0.0',
        'eslint-config-next': '15.0.0',
        typescript: '^5.0.0',
      },
    },
    null,
    2
  );
}

function generateReadme(name: string, description: string): string {
  return `# ${name}

${description}

## Generated with BakedBot Vibe Studio

This project was generated using AI-powered design tools from BakedBot.

### Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view your dispensary website.

### Customization

- Edit colors in \`tailwind.config.ts\`
- Modify products in \`lib/products.ts\`
- Customize components in \`components/\`

### Deploy

Deploy to Vercel or any hosting platform that supports Next.js:

\`\`\`bash
npm run build
\`\`\`

---

Built with 💚 by [BakedBot](https://bakedbot.ai)
`;
}

/**
 * Refine existing code based on user feedback
 */
export async function refineVibeCode(
  project: VibeCodeProject,
  refinementPrompt: string
): Promise<VibeCodeGenerationResult> {
  try {
    logger.info('[VIBE-CODE-REFINE] Refining code', {
      projectId: project.id,
      prompt: refinementPrompt.substring(0, 50),
    });

    const systemPrompt = `You are refining an existing Next.js cannabis dispensary website.
The user wants to make changes to the existing code.

Output ONLY the files that need to be modified in this JSON format:
{
  "files": [
    {"path": "app/page.tsx", "content": "...", "language": "typescript"}
  ],
  "reasoning": "Explanation of changes made"
}`;

    const userPrompt = `Current project: ${project.name}

User wants this change: "${refinementPrompt}"

Current files:
${project.files.slice(0, 3).map((f) => `- ${f.path}`).join('\n')}

Make the requested changes and return ONLY the modified files.`;

    const response = await callClaude({
      systemPrompt,
      userMessage: userPrompt,
      temperature: 0.5,
      maxTokens: 6000,
      model: 'claude-sonnet-4-5-20250929',
    });

    // Parse response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Failed to parse refinement response',
      };
    }

    const parsed: ClaudeCodeResponse = JSON.parse(jsonMatch[0]);

    // Merge changes into existing project
    const updatedFiles = [...project.files];
    for (const updatedFile of parsed.files) {
      const existingIndex = updatedFiles.findIndex((f) => f.path === updatedFile.path);
      if (existingIndex >= 0) {
        // Update existing file
        updatedFiles[existingIndex] = {
          ...updatedFile,
          language: updatedFile.language as any,
        };
      } else {
        // Add new file
        updatedFiles.push({
          ...updatedFile,
          language: updatedFile.language as any,
        });
      }
    }

    const updatedProject: VibeCodeProject = {
      ...project,
      files: updatedFiles,
      updatedAt: new Date().toISOString(),
    };

    logger.info('[VIBE-CODE-REFINE] Refinement successful', {
      projectId: project.id,
      filesModified: parsed.files.length,
    });

    return {
      success: true,
      project: updatedProject,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    logger.error('[VIBE-CODE-REFINE] Refinement failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to refine code. Please try again.',
    };
  }
}
