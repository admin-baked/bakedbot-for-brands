// src/app/playground/page.tsx
export default function PlaygroundPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Component Playground</h1>
        <p className="text-muted-foreground">
          This is a dedicated space for testing new components and features in isolation.
        </p>
        <div className="mt-8 border-t pt-8">
          <h2 className="text-2xl font-semibold">Test Area</h2>
          <div className="mt-4 rounded-lg border border-dashed p-8 text-center">
            <p>Drop your experimental components here.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
