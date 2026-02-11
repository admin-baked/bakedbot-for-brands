'use client';

/**
 * Accept.js Payment Form
 *
 * PCI-compliant credit card form using Authorize.net Accept.js.
 * Tokenizes card data on client-side without touching our servers.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentFormProps {
  amount: number;
  projectName: string;
  onPaymentSuccess: (opaqueData: {
    dataDescriptor: string;
    dataValue: string;
  }) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    Accept: {
      dispatchData: (
        secureData: any,
        responseHandler: (response: any) => void
      ) => void;
    };
  }
}

export function PaymentForm({
  amount,
  projectName,
  onPaymentSuccess,
  onCancel,
}: PaymentFormProps) {
  const [processing, setProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const { toast } = useToast();

  // Load Accept.js script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://jstest.authorize.net/v1/Accept.js'; // Use prod URL for production
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scriptLoaded) {
      toast({
        title: 'Payment System Loading',
        description: 'Please wait a moment and try again',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      // Parse expiry (MM/YY format)
      const [month, year] = cardExpiry.split('/').map((s) => s.trim());
      if (!month || !year || month.length !== 2 || year.length !== 2) {
        toast({
          title: 'Invalid Expiry',
          description: 'Please enter expiry as MM/YY',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      // Get auth data from API
      const configResponse = await fetch('/api/vibe/payment-config');
      const config = await configResponse.json();

      const secureData = {
        authData: {
          clientKey: config.clientKey,
          apiLoginID: config.apiLoginID,
        },
        cardData: {
          cardNumber: cardNumber.replace(/\s/g, ''),
          month,
          year: `20${year}`,
          cardCode: cardCvv,
          fullName: cardholderName,
        },
      };

      // Tokenize card data with Accept.js
      window.Accept.dispatchData(secureData, (response) => {
        if (response.messages.resultCode === 'Error') {
          const errorMessage = response.messages.message
            .map((msg: any) => msg.text)
            .join(', ');

          toast({
            title: 'Payment Error',
            description: errorMessage,
            variant: 'destructive',
          });
          setProcessing(false);
          return;
        }

        // Success! Pass opaque data to parent
        onPaymentSuccess({
          dataDescriptor: response.opaqueData.dataDescriptor,
          dataValue: response.opaqueData.dataValue,
        });
      });
    } catch (error) {
      toast({
        title: 'Payment Failed',
        description: 'Unable to process payment. Please try again.',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Display */}
          <div className="text-center pb-4 border-b">
            <p className="text-sm text-muted-foreground">Payment Amount</p>
            <p className="text-3xl font-bold">${amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">for {projectName}</p>
          </div>

          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Cardholder Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              required
              disabled={processing}
            />
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <div className="relative">
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  if (formatted.replace(/\s/g, '').length <= 16) {
                    setCardNumber(formatted);
                  }
                }}
                required
                disabled={processing}
              />
              <CreditCard className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Expiry */}
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => {
                  const formatted = formatExpiry(e.target.value);
                  if (formatted.replace(/\D/g, '').length <= 4) {
                    setCardExpiry(formatted);
                  }
                }}
                required
                disabled={processing}
              />
            </div>

            {/* CVV */}
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="123"
                type="password"
                maxLength={4}
                value={cardCvv}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCardCvv(value);
                }}
                required
                disabled={processing}
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Lock className="h-4 w-4 text-green-600 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your card information is encrypted and never stored on our servers. Powered by Authorize.net.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={processing || !scriptLoaded}
              className="flex-1 gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
