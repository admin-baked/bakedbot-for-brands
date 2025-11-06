import BrandImageGenerator from './components/brand-image-generator';
import ProductDescriptionForm from './components/blog-post-form';

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
        </div>
      </div>
    </div>
  );
}
