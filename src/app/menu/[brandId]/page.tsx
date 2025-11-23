
'use client';

// This is a placeholder for the demo menu page.
export default function BrandMenuPage({ params }: { params: { brandId: string }}) {
  return (
    <main className="container mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold">Menu for Brand: {params.brandId}</h1>
      <p className="mt-4 text-muted-foreground">This page is now rendering correctly.</p>
    </main>
  );
}
