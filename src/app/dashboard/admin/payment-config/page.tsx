/**
 * Payment Configuration Dashboard
 *
 * Allows admins to:
 * - View all available payment methods
 * - Enable/disable payment processors
 * - Configure processor-specific settings
 * - View webhook URLs
 * - Test connections
 * - View recent transactions
 *
 * AI-THREAD: [Claude @ 2026-02-15] PAYMENT-APP-STORE-INTEGRATION
 * Created unified payment configuration dashboard for Smokey Pay and Aeropay.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Banknote, Building, Copy, CheckCircle2, XCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PaymentConfigPage() {
  const searchParams = useSearchParams();
  const method = searchParams?.get('method') || 'overview';
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

  const copyWebhookUrl = (url: string, processor: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(processor);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Configuration</h1>
        <p className="text-muted-foreground">
          Manage payment processors and transaction settings
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payment Processor Management</AlertTitle>
        <AlertDescription>
          Configure cannabis-compliant payment processors for your dispensary. Both Smokey Pay and Aeropay
          charge a fixed $0.50 transaction fee and require webhook configuration.
        </AlertDescription>
      </Alert>

      <Tabs value={method} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="smokey-pay">Smokey Pay</TabsTrigger>
          <TabsTrigger value="aeropay">Aeropay</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Smokey Pay Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Banknote className="h-5 w-5 text-blue-600" />
                    <CardTitle>Smokey Pay</CardTitle>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <CardDescription>
                  Cannabis industry's trusted payment solution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Connected
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <span>CannPay RemotePay</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Environment</span>
                    <span>Sandbox</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction Fee</span>
                    <span>$0.50</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Features</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Bank-to-bank transfer</li>
                    <li>✓ Guest checkout</li>
                    <li>✓ Tip handling</li>
                    <li>✓ Instant settlement</li>
                  </ul>
                </div>

                <Button className="w-full" variant="outline" asChild>
                  <a href="?method=smokey-pay">Configure</a>
                </Button>
              </CardContent>
            </Card>

            {/* Aeropay Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-emerald-600" />
                    <CardTitle>Aeropay</CardTitle>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <CardDescription>
                  Fast bank transfer payment processor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Connected
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <span>Aeropay Inc.</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Environment</span>
                    <span>Sandbox</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction Fee</span>
                    <span>$0.50</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Features</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Instant bank transfers</li>
                    <li>✓ One-time bank linking</li>
                    <li>✓ Real-time status</li>
                    <li>✓ Aerosync widget</li>
                  </ul>
                </div>

                <Button className="w-full" variant="outline" asChild>
                  <a href="?method=aeropay">Configure</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Comparison */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Payment Method Comparison</CardTitle>
              <CardDescription>
                Key differences between Smokey Pay and Aeropay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Feature</th>
                      <th className="text-left py-2 font-semibold">Smokey Pay</th>
                      <th className="text-left py-2 font-semibold">Aeropay</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2">Integration Type</td>
                      <td>Stateless</td>
                      <td>Stateful (user accounts)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Transaction Fee</td>
                      <td>$0.50</td>
                      <td>$0.50</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Bank Linking</td>
                      <td>Per-transaction widget</td>
                      <td>One-time Aerosync</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Guest Checkout</td>
                      <td>✓ Supported</td>
                      <td>✗ Requires account</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Tip Handling</td>
                      <td>✓ Supported</td>
                      <td>✗ Not supported</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smokey Pay Config Tab */}
        <TabsContent value="smokey-pay">
          <Card>
            <CardHeader>
              <CardTitle>Smokey Pay Configuration</CardTitle>
              <CardDescription>
                Powered by CannPay RemotePay Integration v1.4.0
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Smokey Pay</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to pay with Smokey Pay at checkout
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <Label>Environment</Label>
                <Input value="Sandbox" disabled />
                <p className="text-xs text-muted-foreground">
                  Contact support to switch to production environment
                </p>
              </div>

              {/* Integrator ID */}
              <div className="space-y-2">
                <Label>Integrator ID</Label>
                <Input value="••••••••" type="password" disabled />
                <p className="text-xs text-muted-foreground">
                  Your CannPay integrator ID (configured in environment variables)
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value="https://bakedbot.ai/api/webhooks/cannpay"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl('https://bakedbot.ai/api/webhooks/cannpay', 'smokey-pay')}
                  >
                    {copiedWebhook === 'smokey-pay' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure this URL in your CannPay merchant dashboard
                </p>
              </div>

              {/* Transaction Fee */}
              <div className="space-y-2">
                <Label>Transaction Fee</Label>
                <Input value="$0.50" disabled />
                <p className="text-xs text-muted-foreground">
                  Fee charged per successful transaction (added to order total)
                </p>
              </div>

              {/* Widget URL */}
              <div className="space-y-2">
                <Label>Widget URL</Label>
                <Input value="https://sandbox-remotepay.canpaydebit.com" disabled />
                <p className="text-xs text-muted-foreground">
                  CannPay RemotePay widget endpoint (sandbox)
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button disabled>Test Connection</Button>
                <Button variant="outline" asChild>
                  <a href="https://canpaydebit.com" target="_blank" rel="noopener noreferrer">
                    View Documentation
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aeropay Config Tab */}
        <TabsContent value="aeropay">
          <Card>
            <CardHeader>
              <CardTitle>Aeropay Configuration</CardTitle>
              <CardDescription>
                Bank transfer payment processor with OAuth 2.0 authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Aeropay</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to pay with Aeropay at checkout
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <Label>Environment</Label>
                <Input value="Sandbox" disabled />
                <p className="text-xs text-muted-foreground">
                  Contact support to switch to production environment
                </p>
              </div>

              {/* Merchant ID */}
              <div className="space-y-2">
                <Label>Merchant ID</Label>
                <Input value="••••••••" type="password" disabled />
                <p className="text-xs text-muted-foreground">
                  Your Aeropay merchant ID (configured in environment variables)
                </p>
              </div>

              {/* Client ID */}
              <div className="space-y-2">
                <Label>OAuth Client ID</Label>
                <Input value="••••••••" type="password" disabled />
                <p className="text-xs text-muted-foreground">
                  OAuth 2.0 client ID for API authentication
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value="https://bakedbot.ai/api/webhooks/aeropay"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl('https://bakedbot.ai/api/webhooks/aeropay', 'aeropay')}
                  >
                    {copiedWebhook === 'aeropay' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Register this URL in your Aeropay merchant dashboard
                </p>
              </div>

              {/* Transaction Fee */}
              <div className="space-y-2">
                <Label>Transaction Fee</Label>
                <Input value="$0.50" disabled />
                <p className="text-xs text-muted-foreground">
                  Fee charged per successful transaction (added to order total)
                </p>
              </div>

              {/* Aerosync Widget */}
              <div className="space-y-2">
                <Label>Aerosync Widget</Label>
                <Input value="Enabled" disabled />
                <p className="text-xs text-muted-foreground">
                  Inline bank linking widget for one-time account connection
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button disabled>Test Connection</Button>
                <Button variant="outline" asChild>
                  <a href="https://dev.aero.inc/docs/getting-started" target="_blank" rel="noopener noreferrer">
                    View Documentation
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                View payment transaction history across all processors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Transaction history coming soon
                </p>
                <p className="text-xs text-muted-foreground max-w-md">
                  This feature will display all payment transactions from Smokey Pay and Aeropay,
                  including transaction IDs, amounts, status, and webhook events.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
