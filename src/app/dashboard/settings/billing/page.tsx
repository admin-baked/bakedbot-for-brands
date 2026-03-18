import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/firebase/server-client';
import { getSubscription, cancelSubscription, getInvoices } from '@/server/actions/subscription';
import { TIERS } from '@/config/tiers';
import { UpgradeButton } from './upgrade-button';
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
import { CreditCard, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import type { AIStudioBalanceDoc, AIStudioEntitlementDoc } from '@/types/ai-studio';

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

  // Get invoices
  const invoices = await getInvoices(orgId);

  // AI Studio usage
  const aiCycleKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [aiBalanceDoc, aiEntitlementDoc] = await Promise.all([
    firestore.collection('org_ai_studio_balances').doc(`${orgId}-${aiCycleKey}`).get(),
    firestore.collection('org_ai_studio_entitlements').doc(orgId).get(),
  ]);
  const aiBalance = aiBalanceDoc.exists ? (aiBalanceDoc.data() as AIStudioBalanceDoc) : null;
  const aiEntitlement = aiEntitlementDoc.exists
    ? (aiEntitlementDoc.data() as AIStudioEntitlementDoc)
    : null;

  const aiTotalUsed = aiBalance
    ? aiBalance.includedCreditsUsed + aiBalance.rolloverCreditsUsed + aiBalance.topUpCreditsUsed
    : 0;
  const aiTotalAvailable = aiBalance
    ? aiBalance.includedCreditsTotal + aiBalance.rolloverCreditsTotal + aiBalance.topUpCreditsTotal
    : 0;
  const aiTotalPct = aiTotalAvailable > 0 ? Math.min((aiTotalUsed / aiTotalAvailable) * 100, 100) : 0;
  const aiAutoPct =
    aiBalance && aiBalance.automationBudgetTotal > 0
      ? Math.min((aiBalance.automationBudgetUsed / aiBalance.automationBudgetTotal) * 100, 100)
      : 0;

  // Active playbooks count
  const activePlaybooksSnap = await firestore
    .collection('playbooks')
    .where('orgId', '==', orgId)
    .where('enabled', '==', true)
    .count()
    .get();
  const activePlaybooksCount = activePlaybooksSnap.data().count;
  const maxPlaybooks = aiEntitlement?.maxActivePlaybooks ?? 0;

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

      {/* AI Studio Credits */}
      {aiEntitlement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-600" />
              AI Studio Credits
            </CardTitle>
            <CardDescription>
              {aiCycleKey} — credits power chat, images, and video workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Credits */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">AI Studio Credits</span>
                <span className="text-sm text-gray-600">
                  {aiTotalUsed.toLocaleString()} / {aiTotalAvailable.toLocaleString()} used
                  {aiBalance?.alertsSent?.pct80 && !aiBalance?.alertsSent?.pct100 && (
                    <span className="ml-2 text-amber-600 font-medium">⚠ 80% used</span>
                  )}
                  {aiBalance?.alertsSent?.pct100 && (
                    <span className="ml-2 text-red-600 font-medium">⚠ Included credits used</span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    aiTotalPct >= 100
                      ? 'bg-red-500'
                      : aiTotalPct >= 80
                        ? 'bg-amber-500'
                        : 'bg-violet-600'
                  }`}
                  style={{ width: `${aiTotalPct}%` }}
                />
              </div>
              {aiBalance && aiBalance.rolloverCreditsTotal > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Includes {aiBalance.rolloverCreditsTotal} rollover credits
                </p>
              )}
              {aiBalance && aiBalance.topUpCreditsTotal > 0 && (
                <p className="text-xs text-gray-500">
                  +{(aiBalance.topUpCreditsTotal - aiBalance.topUpCreditsUsed).toLocaleString()} top-up credits remaining
                </p>
              )}
            </div>

            {/* Automation Budget */}
            {aiEntitlement.monthlyAutomationCreditBudget > 0 && aiBalance && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Automation AI Budget</span>
                  <span className="text-sm text-gray-600">
                    {aiBalance.automationBudgetUsed.toLocaleString()} / {aiBalance.automationBudgetTotal.toLocaleString()} used
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      aiAutoPct >= 100 ? 'bg-red-500' : aiAutoPct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${aiAutoPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Reserved for playbook automations — separate from your manual credit pool
                </p>
              </div>
            )}

            {/* Active Playbooks */}
            {maxPlaybooks > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Active Playbooks</span>
                  <span className="text-sm text-gray-600">
                    {activePlaybooksCount} / {maxPlaybooks}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full transition-all"
                    style={{
                      width: `${Math.min((activePlaybooksCount / maxPlaybooks) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Credit breakdown pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {aiEntitlement.allowChat && (
                <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
                  Chat (1 cr)
                </span>
              )}
              {aiEntitlement.allowResearch && (
                <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
                  Research (5 cr)
                </span>
              )}
              {aiEntitlement.allowImages && (
                <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
                  Images (12 cr)
                </span>
              )}
              {aiEntitlement.allowCreativeBatch && (
                <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
                  Creative batch (25 cr)
                </span>
              )}
              {aiEntitlement.allowShortVideo && (
                <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
                  Short video (60 cr)
                </span>
              )}
              {aiEntitlement.allowFullVideo && (
                <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
                  Full video (120 cr)
                </span>
              )}
            </div>

            {/* Top-up CTA when running low */}
            {aiEntitlement.canPurchaseTopUps && aiTotalPct >= 80 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Running low on credits</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Top-up packs available from $29 for 250 credits
                  </p>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                  Buy Credits
                </Button>
              </div>
            )}
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
            <UpgradeButton orgId={orgId} currentTierId={subscription.tierId as any} />

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

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Past invoices and payment records</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm">{invoice.description}</td>
                      <td className="py-3 px-4 text-sm font-medium">${invoice.amount}/month</td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : invoice.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              No invoices found. Billing history will appear here once you have an active
              subscription.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
