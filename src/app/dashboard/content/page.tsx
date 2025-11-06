import BrandImageGenerator from './components/brand-image-generator';
import ProductDescriptionForm from './components/blog-post-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Wand2 } from 'lucide-react';

export default function ProductDescriptionGeneratorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Content Suite</h1>
        <p className="text-muted-foreground">
          Generate compelling product descriptions, social media images, and more with the power of AI.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 @container md:grid-cols-2">
        <ProductDescriptionForm />
        <div className="flex flex-col gap-8">
            <BrandImageGenerator />
             <Card>
                <CardHeader>
                    <CardTitle>AI Review Summarizer</CardTitle>
                    <CardDescription>Get instant insights by summarizing all reviews for a specific product.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-full min-h-[150px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-6 text-center">
                        <Wand2 className="h-12 w-12 text-muted-foreground/30" />
                        <p className="mt-4 text-sm text-muted-foreground">This feature is coming soon! It will allow you to select a product and receive an AI-generated summary of its pros and cons based on customer reviews.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
