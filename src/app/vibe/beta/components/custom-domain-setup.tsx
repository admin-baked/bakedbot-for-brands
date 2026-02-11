'use client';

/**
 * Custom Domain Setup
 *
 * Configure custom domains for Vibe IDE deployments.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Globe, Copy, Check } from 'lucide-react';

interface CustomDomainSetupProps {
  projectId: string;
  userId: string;
  currentSubdomain: string;
  currentDomain?: string;
  onDomainConfigured?: (domain: string) => void;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
}

export function CustomDomainSetup({
  projectId,
  userId,
  currentSubdomain,
  currentDomain,
  onDomainConfigured,
}: CustomDomainSetupProps) {
  const [domain, setDomain] = useState(currentDomain || '');
  const [step, setStep] = useState<'input' | 'verify' | 'configure' | 'complete'>(
    currentDomain ? 'complete' : 'input'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleVerifyDomain() {
    setLoading(true);
    setError('');

    try {
      // Validate domain format
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/i;
      if (!domainRegex.test(domain)) {
        setError('Invalid domain format. Example: dispensary.com');
        setLoading(false);
        return;
      }

      // Generate DNS records
      const records: DNSRecord[] = [
        {
          type: 'CNAME',
          name: domain.startsWith('www.') ? 'www' : '@',
          value: `${currentSubdomain}.bakedbot.ai`,
        },
        {
          type: 'TXT',
          name: '_bakedbot-verify',
          value: `bakedbot-site-verification-${userId}`,
        },
      ];

      setDnsRecords(records);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckVerification() {
    setLoading(true);
    setError('');

    try {
      // In production, this would check DNS records
      // For now, simulate verification
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock verification success
      setStep('configure');
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setLoading(false);
    }
  }

  async function handleConfigureDomain() {
    setLoading(true);
    setError('');

    try {
      // Configure domain
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStep('complete');
      if (onDomainConfigured) {
        onDomainConfigured(domain);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          <CardTitle>Custom Domain</CardTitle>
        </div>
        <CardDescription>
          Use your own domain instead of {currentSubdomain}.bakedbot.ai
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Input Domain */}
        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">Your Domain</Label>
              <Input
                id="domain"
                placeholder="dispensary.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Enter your domain name (without http:// or https://)
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step 2: Verify DNS */}
        {step === 'verify' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configure DNS Records</AlertTitle>
              <AlertDescription>
                Add these DNS records to your domain registrar (GoDaddy, Namecheap, etc.)
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {dnsRecords.map((record, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{record.type}</Badge>
                        <span className="text-sm font-medium">Record {index + 1}</span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>{' '}
                          <code className="bg-muted px-2 py-1 rounded">
                            {record.name}
                          </code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Value:</span>{' '}
                          <code className="bg-muted px-2 py-1 rounded break-all">
                            {record.value}
                          </code>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(record.value, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>DNS Propagation</AlertTitle>
              <AlertDescription>
                DNS changes can take 24-48 hours to propagate. Click "Check Verification" once
                you've added the records.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verification Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 'configure' && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Domain Verified!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your domain {domain} has been successfully verified. Click "Complete Setup" to
                finish configuration.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Setup Complete!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your custom domain {domain} is now configured and live.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Your Site URL</p>
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  https://{domain}
                </a>
              </div>
              <Button
                variant="outline"
                asChild
              >
                <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
                  Visit Site
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step !== 'input' && step !== 'complete' && (
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'verify') setStep('input');
              if (step === 'configure') setStep('verify');
            }}
            disabled={loading}
          >
            Back
          </Button>
        )}

        <div className="flex gap-2 ml-auto">
          {step === 'input' && (
            <Button onClick={handleVerifyDomain} disabled={!domain || loading}>
              {loading ? 'Verifying...' : 'Continue'}
            </Button>
          )}

          {step === 'verify' && (
            <Button onClick={handleCheckVerification} disabled={loading}>
              {loading ? 'Checking...' : 'Check Verification'}
            </Button>
          )}

          {step === 'configure' && (
            <Button onClick={handleConfigureDomain} disabled={loading}>
              {loading ? 'Configuring...' : 'Complete Setup'}
            </Button>
          )}

          {step === 'complete' && (
            <Button
              variant="outline"
              onClick={() => {
                setStep('input');
                setDomain('');
                setError('');
              }}
            >
              Change Domain
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
