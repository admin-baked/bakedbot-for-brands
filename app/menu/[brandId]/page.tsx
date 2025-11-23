
// app/menu/[brandId]/page.tsx

type MenuPageProps = {
  params: { brandId: string };
};

export default function BrandMenuPage({ params }: MenuPageProps) {
  const brandId = params.brandId || 'default';

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-4">
      <h1 className="font-display text-3xl md:text-4xl font-teko tracking-wider uppercase">
        Demo Menu – {brandId}
      </h1>
      <p className="text-sm text-gray-600">
        This is a minimal placeholder coming from <code>app/menu/[brandId]/page.tsx</code>.
        If you&apos;re seeing this, the 404 is fixed and the route is wired correctly.
      </p>
    </main>
  );
}
