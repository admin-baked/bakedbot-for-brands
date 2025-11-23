// src/app/page.tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold text-center">
        BakedBot AI – Agentic Commerce OS for Cannabis
      </h1>
      <p className="max-w-xl text-center text-lg text-gray-600">
        Your AI workforce for cannabis brands: Smokey, Craig, Pops, Ezal, Deebo,
        Money Mike, and Mrs. Parker all under one roof.
      </p>
      <a
        href="/menu/default"
        className="px-6 py-3 rounded-full border text-base font-medium hover:opacity-80 transition"
      >
        View Demo Menu
      </a>
    </main>
  );
}
