import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  VISITOR_CHECKIN_EXPECTED_RESULTS,
  VISITOR_CHECKIN_QA_CHECKLIST,
} from '@/lib/checkin/visitor-checkin-training';
import { requireUser } from '@/server/auth/auth';

export const dynamic = 'force-dynamic';

export default async function TestLoyaltyPage() {
  try {
    await requireUser(['super_user']);
  } catch {
    redirect('/signin?redirect=/test-loyalty');
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Restricted</Badge>
          <Badge variant="outline">Thrive Syracuse</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Visitor Check-In QA Hub</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Use this internal page to validate the Thrive front-door check-in flow end to end,
            including the public rewards entry point, the in-store tablet flow, and the CRM writes
            that power retention playbooks.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Public check-in</CardTitle>
            <CardDescription>Customer-facing rewards path</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/thrivesyracuse/rewards#check-in" target="_blank" rel="noreferrer">
                Open public check-in
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tablet check-in</CardTitle>
            <CardDescription>In-store kiosk path</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link
                href="/loyalty-tablet?orgId=org_thrive_syracuse"
                target="_blank"
                rel="noreferrer"
              >
                Open tablet flow
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Staff training</CardTitle>
            <CardDescription>QR, training, and launch checklist</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/loyalty-tablet-qr" target="_blank" rel="noreferrer">
                Open training page
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tight QA checklist</CardTitle>
            <CardDescription>Run these four scenarios in order.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
              {VISITOR_CHECKIN_QA_CHECKLIST.map((scenario) => (
                <li key={scenario}>
                  {scenario}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expected results</CardTitle>
            <CardDescription>Verify copy, consent, and Firestore behavior.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-3 pl-5 text-sm text-muted-foreground">
              {VISITOR_CHECKIN_EXPECTED_RESULTS.map((item) => (
                <li key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
