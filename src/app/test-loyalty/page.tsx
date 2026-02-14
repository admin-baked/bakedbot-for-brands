import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';

export const dynamic = 'force-dynamic';

export default async function TestLoyaltyPage() {
  try {
    await requireUser(['super_user']);
  } catch {
    redirect('/signin?redirect=/test-loyalty');
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Loyalty Test</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This internal test route is intentionally restricted. Use the standard Loyalty flows instead.
      </p>
    </main>
  );
}

