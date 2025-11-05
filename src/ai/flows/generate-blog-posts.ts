'use server';

/**
 * @fileOverview Generates blog posts on specific topics related to products.
 *
 * - generateBlogPost - A function that generates a blog post.
 * - GenerateBlogPostInput - The input type for the generateBlogPost function.
 * - GenerateBlogPostOutput - The return type for the generateBlogPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The topic of the blog post.'),
  productType: z.string().describe('The product type related to the blog post.'),
  keywords: z.string().describe('Keywords to include in the blog post.'),
  tone: z.string().describe('The tone of the blog post (e.g., informative, humorous).'),
  length: z.string().describe('The desired length of the blog post (e.g., short, medium, long).'),
});

export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('The title of the blog post.'),
  content: z.string().describe('The generated content of the blog post.'),
});

export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBlogPostPrompt',
  input: {schema: GenerateBlogPostInputSchema},
  output: {schema: GenerateBlogPostOutputSchema},
  prompt: `You are a content writer specializing in blog posts related to cannabis products.

  Generate a blog post on the following topic:
  Topic: {{{topic}}}
  Product Type: {{{productType}}}
  Keywords: {{{keywords}}}
  Tone: {{{tone}}}
  Length: {{{length}}}

  The blog post should be engaging and informative, providing value to the reader.
  Include relevant keywords to improve search engine optimization.

  Ensure the content is accurate and reflects current knowledge in the field.
`,
});

const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
