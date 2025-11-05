'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type GenerateBlogPostOutput } from '@/ai/flows/generate-blog-posts';
import { Button } from '@/components/ui/button';
import { Clipboard, ThumbsUp, ThumbsDown, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BlogPostDisplayProps {
  blogPost: GenerateBlogPostOutput | null;
}

export default function BlogPostDisplay({ blogPost }: BlogPostDisplayProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (blogPost?.content) {
      navigator.clipboard.writeText(blogPost.content);
      toast({
        title: 'Copied!',
        description: 'Blog post content copied to clipboard.',
      });
    }
  };

  return (
    <Card className="flex flex-col @container">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle>{blogPost?.title ?? 'Generated Blog Post'}</CardTitle>
            <CardDescription>Review the AI-generated content below.</CardDescription>
        </div>
        {blogPost && (
          <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy content">
            <Clipboard className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {blogPost ? (
          <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: blogPost.content.replace(/\n/g, '<br />') }} />
        ) : (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center text-muted-foreground">
            <p>Your generated blog post will appear here. <br/> Fill out the form and click "Generate Post" to start.</p>
          </div>
        )}
      </CardContent>
        {blogPost && (
         <CardContent className="border-t pt-4">
             <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Content feedback:</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Good"><ThumbsUp className="h-4 w-4"/></Button>
                    <Button variant="outline" size="icon" aria-label="Bad"><ThumbsDown className="h-4 w-4"/></Button>
                    <Button variant="outline" size="icon" aria-label="Regenerate"><RotateCw className="h-4 w-4"/></Button>
                </div>
             </div>
        </CardContent>
        )}
    </Card>
  );
}
