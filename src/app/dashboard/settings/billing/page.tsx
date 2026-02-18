import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/firebase/server-client';
import { getSubscription, cancelSubscription } from '@/server/actions/subscription';
import { TIERS } from '@/config/tiers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BillingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await requireUser();
  const { firestore } = await createServerClient();

  // Get current org from query param or user's primary org
  const params = await searchParams;
  const orgId = (params.orgId as string) || user.currentOrgId;

  if (!orgId) {
    redirect('/dashboard');
  }

  // Verify user is org owner
  const orgDoc = await firestore.collection('organizations').doc(orgId).get();
  if (!orgDoc.exists) {
    redirect('/dashboard');
  }

  const org = orgDoc.data();
  if (!org || (org.ownerId !== user.uid && org.ownerUid !== user.uid)) {
    redirect('/dashboard');
  }

  // Get subscription
  const subscription = await getSubscription(orgId);

  // Get usage for current month
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const usageDoc = await firestore.collection('usage').doc(`${orgId}-${period}`).get();
  const usage = usageDoc.exists ? usageDoc.data() : null;

  const tierConfig = subscription ? TIERS[subscription.tierId as keyof typeof TIERS] : null;

  // Format next billing date
  const nextBillingDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd.seconds * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Status badge color
  const statusColor =
    subscription?.status === 'active'
      ? 'bg-emerald-100 text-emerald-800'
      : subscription?.status === 'canceled'
        ? 'bg-gray-100 text-gray-800'
        : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your plan, payment method, and invoices</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Your subscription details and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscription && tierConfig ? (
            <div className="space-y-6">
              {/* Plan Info */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Plan Name</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold">{tierConfig?.name}</h3>
                    <Badge className={statusColor}>{subscription.status}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monthly Cost</p>
                  <p className="text-2xl font-bold">${tierConfig?.price}</p>
                </div>
              </div>

              {/* Promo Applied */}
              {subscription.promoCode && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-900">Promo Applied</p>
                      <p className="text-sm text-emerald-700">
                        Code: <span className="font-mono">{subscription.promoCode}</span>
                      </p>
                      {subscription.promoType === 'free_months' && subscription.promoMonthsRemaining > 0 && (
                        <p className="text-sm text-emerald-700 mt-1">
                          {subscription.promoMonthsRemaining} months free remaining
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Next Billing */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Next Billing Date</p>
                <p className="text-lg font-semibold text-blue-900">{nextBillingDate}</p>
              </div>

              {/* Plan Features */}
              {tierConfig && (
                <div>
                  <h4 className="font-semibold mb-3">Included Features</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(tierConfig.features).map(([feature, included]) => {
                      const isIncluded = included as boolean;
                      return (
                        <div key={feature} className="flex items-center gap-2 text-sm">
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center ${
                              isIncluded
                                ? 'bg-emerald-100 border-emerald-300'
                                : 'bg-gray-100 border-gray-300'
                            }`}
                          >
                            {isIncluded && <span className="text-emerald-600 text-xs font-bold">✓</span>}
                          </div>
                          <span className={isIncluded ? 'text-gray-900' : 'text-gray-400'}>
                            {feature.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600 mb-4">No active subscription</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Choose a Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      {subscription && usage && tierConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Current Month Usage</CardTitle>
            <CardDescription>
              {period} — Reset on {nextBillingDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* SMS Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Customer SMS</span>
                  <span className="text-sm text-gray-600">
                    {usage.smsCustomerUsed} / {tierConfig.allocations.smsCustomer.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all"
                    style={{
                      width: `${Math.min(
                        (usage.smsCustomerUsed / tierConfig.allocations.smsCustomer) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Email Usage */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Emails</span>
                  <span className="text-sm text-gray-600">
                    {usage.emailsUsed} / {tierConfig.allocations.emails.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{
                      width: `${Math.min(
                        (usage.emailsUsed / tierConfig.allocations.emails) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Creative Assets */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Creative Assets</span>
                  <span className="text-sm text-gray-600">
                    {usage.creativeAssetsUsed} / {tierConfig.allocations.creativeAssets.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all"
                    style={{
                      width: `${Math.min(
                        (usage.creativeAssetsUsed / tierConfig.allocations.creativeAssets) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Competitors */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Competitors Tracked</span>
                  <span className="text-sm text-gray-600">
                    {usage.competitorsTracked} / {tierConfig.allocations.competitors}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-orange-600 h-full transition-all"
                    style={{
                      width: `${Math.min(
                        (usage.competitorsTracked / tierConfig.allocations.competitors) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              Upgrade Plan
            </Button>

            {subscription.status === 'active' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Cancel Subscription?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Canceling will immediately deactivate your plan and revoke access to premium
                      features. You can resubscribe at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3">
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={async () => {
                        const result = await cancelSubscription(orgId);
                        if (result.success) {
                          window.location.reload();
                        }
                      }}
                    >
                      Yes, Cancel
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing History Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Past invoices and payment records</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">
            Billing history will appear here once you have an active subscription.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
