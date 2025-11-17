import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Welcome to BakedBot</h1>
      <p className="text-lg text-muted-foreground mb-8">Your app is ready. You can start by editing this page.</p>
      <div className="flex gap-4">
        <Link href="/menu/default" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          View Demo Menu
        </Link>
        <Link href="/dashboard" className="px-4 py-2 border rounded-md">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
