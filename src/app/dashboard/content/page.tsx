import BlogPostForm from './components/blog-post-form';

export default function ContentCreatorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Content Creator</h1>
        <p className="text-muted-foreground">
          Generate engaging blog posts for your WordPress site with the power of AI.
        </p>
      </div>
      <BlogPostForm />
    </div>
  );
}
