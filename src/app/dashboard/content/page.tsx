import ProductDescriptionForm from './components/blog-post-form';

export default function ProductDescriptionGeneratorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Product Description Generator</h1>
        <p className="text-muted-foreground">
          Generate compelling product descriptions for your inventory with the power of AI.
        </p>
      </div>
      <ProductDescriptionForm />
    </div>
  );
}
