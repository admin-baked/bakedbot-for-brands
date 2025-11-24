
// src/app/page.tsx

export default function HomePage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">BakedBot AI</h1>
      <p className="text-muted-foreground">
        Agentic Commerce OS for cannabis brands. This is the marketing / home
        route for "/".
      </p>
      <p>
        <a href="/dashboard" className="underline">
          Go to dashboard
        </a>
      </p>
    </main>
  );
}
