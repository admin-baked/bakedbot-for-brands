import { z } from 'zod';
import { JuniorWork } from '../definition';
import { registerJuniorWork } from '../registry';

const inputSchema = z.object({
    url: z.string().url(),
    contentSummary: z.string().min(10),
    keywords: z.array(z.string()).optional()
});

const outputSchema = z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string() // Comma-separated
});

const generateMeta: JuniorWork<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
    id: 'marketing.seo.generate-meta',
    name: 'Generate SEO Meta Tags',
    description: 'Generates optimized title, description, and keyword tags based on content summary.',
    inputSchema,
    outputSchema,
    requiredPermissions: ['marketing'],
    handler: async (inputs, context) => {
        // Mock AI generation logic for now
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work

        return {
            title: `Optimized Title for ${inputs.url}`,
            description: `Compelling meta description based on: ${inputs.contentSummary.substring(0, 50)}...`,
            keywords: inputs.keywords ? inputs.keywords.join(', ') : 'seo, optimized, automated'
        };
    }
};

// Auto-register
registerJuniorWork(generateMeta);

export default generateMeta;
