'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MapPin,
  Phone,
  Mail,
  QrCode,
  CheckCircle,
  Clock,
  Store,
  ShoppingCart,
  ArrowRight,
  Loader2,
  Copy,
  MessageCircle,
  Shield,
  Leaf,
  Calendar,
  User,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/domain';
import { calculateCartTotals, safeUnitPrice } from '@/components/demo/cart-pricing';

interface CartItem extends Product {
  quantity: number;
}

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  hours?: string;
}

interface BrandCheckoutFlowProps {
  brandName: string;
  brandLogo?: string;
  primaryColor?: string;
  cartItems: CartItem[];
  pickupLocation: PickupLocation;
  onBack?: () => void;
  onComplete?: (orderData: OrderConfirmation) => void;
}

interface OrderConfirmation {
  orderId: string;
  qrCode: string;
  estimatedPickup: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

type CheckoutStep = 'review' | 'contact' | 'confirm' | 'complete';

export function BrandCheckoutFlow({
  brandName,
  brandLogo,
  primaryColor = '#16a34a',
  cartItems,
  pickupLocation,
  onBack,
  onComplete,
}: BrandCheckoutFlowProps) {
  const [step, setStep] = useState<CheckoutStep>('review');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);

  // Calculate totals
  const { subtotal, tax, total } = calculateCartTotals(cartItems);

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);

    // Simulate order submission
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate order confirmation
    const confirmation: OrderConfirmation = {
      orderId: `BB-${Date.now().toString(36).toUpperCase()}`,
      qrCode: `data:image/svg+xml,${encodeURIComponent(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <rect x="20" y="20" width="40" height="40" fill="black"/>
          <rect x="140" y="20" width="40" height="40" fill="black"/>
          <rect x="20" y="140" width="40" height="40" fill="black"/>
          <rect x="80" y="80" width="40" height="40" fill="black"/>
          <rect x="60" y="20" width="20" height="20" fill="black"/>
          <rect x="100" y="40" width="20" height="20" fill="black"/>
          <rect x="40" y="100" width="20" height="20" fill="black"/>
          <rect x="120" y="120" width="20" height="20" fill="black"/>
          <rect x="160" y="80" width="20" height="20" fill="black"/>
          <text x="100" y="190" text-anchor="middle" font-size="12" font-family="monospace">ORDER QR</text>
        </svg>
      `)}`,
      estimatedPickup: 'Ready in 15-30 minutes',
      customer: {
        name: `${firstName} ${lastName}`,
        email,
        phone,
      },
    };

    setOrderConfirmation(confirmation);
    setStep('complete');
    setIsSubmitting(false);
    onComplete?.(confirmation);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {(['review', 'contact', 'confirm', 'complete'] as CheckoutStep[]).map((s, index) => (
        <div key={s} className="flex items-center">
          <div
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium',
              step === s
                ? 'text-white'
                : ['review', 'contact', 'confirm', 'complete'].indexOf(step) > index
                ? 'bg-green-100 text-green-700'
                : 'bg-muted text-muted-foreground'
            )}
            style={step === s ? { backgroundColor: primaryColor } : {}}
          >
            {['review', 'contact', 'confirm', 'complete'].indexOf(step) > index ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              index + 1
            )}
          </div>
          {index < 3 && (
            <div
              className={cn(
                'w-12 h-0.5 mx-1',
                ['review', 'contact', 'confirm', 'complete'].indexOf(step) > index
                  ? 'bg-green-200'
                  : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Pickup Location */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" style={{ color: primaryColor }} />
              Pickup Location
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onBack}>
              Change
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">{pickupLocation.name}</p>
          <p className="text-sm text-muted-foreground">
            {pickupLocation.address}, {pickupLocation.city}, {pickupLocation.state} {pickupLocation.zip}
          </p>
          {pickupLocation.hours && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {pickupLocation.hours}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" style={{ color: primaryColor }} />
            Order Summary ({cartItems.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <Leaf className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.category}</p>
                <p className="text-sm">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold">${(safeUnitPrice(item.price) * item.quantity).toFixed(2)}</p>
            </div>
          ))}

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cannabis Tax (25%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span style={{ color: primaryColor }}>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50">
          <p className="text-xs text-muted-foreground">
            <Shield className="h-3 w-3 inline mr-1" />
            Payment will be collected at pickup. Bring valid ID.
          </p>
        </CardFooter>
      </Card>

      <Button
        size="lg"
        className="w-full h-14 text-lg font-bold"
        style={{ backgroundColor: primaryColor }}
        onClick={() => setStep('contact')}
      >
        Continue to Contact Info
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );

  const renderContactStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" style={{ color: primaryColor }} />
            Your Information
          </CardTitle>
          <CardDescription>
            We&apos;ll send your order confirmation via email and SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="pl-10"
                required
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="smsOptIn"
                checked={smsOptIn}
                onCheckedChange={(checked) => setSmsOptIn(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="smsOptIn"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Send me SMS updates
                </label>
                <p className="text-xs text-muted-foreground">
                  Get order status and pickup notifications via text
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="emailOptIn"
                checked={emailOptIn}
                onCheckedChange={(checked) => setEmailOptIn(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="emailOptIn"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Stay updated on {brandName}
                </label>
                <p className="text-xs text-muted-foreground">
                  Receive exclusive deals and new product announcements
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep('review')}>
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1 font-bold"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setStep('confirm')}
          disabled={!firstName || !lastName || !email || !phone}
        >
          Continue
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" style={{ color: primaryColor }} />
            Confirm Your Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span>{cartItems.length} products</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold" style={{ color: primaryColor }}>
                ${total.toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pickup</span>
              <span className="text-right text-sm">{pickupLocation.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact</span>
              <span className="text-right text-sm">
                {firstName} {lastName}
                <br />
                {email}
              </span>
            </div>
          </div>

          {/* Age Verification */}
          <div className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="ageVerified"
                checked={ageVerified}
                onCheckedChange={(checked) => setAgeVerified(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="ageVerified"
                  className="text-sm font-medium leading-none"
                >
                  I confirm I am 21 years or older
                </label>
                <p className="text-xs text-muted-foreground">
                  You will need to present valid government-issued ID at pickup.
                  Orders cannot be transferred to another person.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <QrCode className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  You&apos;ll receive a QR code
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Show this code to the budtender when you arrive. They&apos;ll have your order ready!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep('contact')}>
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1 h-14 text-lg font-bold"
          style={{ backgroundColor: primaryColor }}
          onClick={handleSubmitOrder}
          disabled={!ageVerified || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              Place Order
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!orderConfirmation) return null;

    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="text-center py-6">
          <div
            className="h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
          <p className="text-muted-foreground">
            Your order has been sent to {pickupLocation.name}
          </p>
        </div>

        {/* QR Code Card */}
        <Card className="border-2" style={{ borderColor: primaryColor }}>
          <CardHeader className="text-center pb-2">
            <Badge className="w-fit mx-auto mb-2" style={{ backgroundColor: primaryColor }}>
              Order #{orderConfirmation.orderId}
            </Badge>
            <CardTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5" />
              Your Pickup Code
            </CardTitle>
            <CardDescription>Show this to the budtender</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {/* QR Code Placeholder */}
            <div className="bg-white p-4 rounded-xl shadow-inner border-2 mb-4">
              <div className="w-48 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-24 w-24 mx-auto text-gray-400" />
                  <p className="text-xs text-gray-500 mt-2 font-mono">{orderConfirmation.orderId}</p>
                </div>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center gap-2 text-lg font-medium mb-4">
              <Clock className="h-5 w-5" style={{ color: primaryColor }} />
              {orderConfirmation.estimatedPickup}
            </div>

            {/* Copy Order ID */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigator.clipboard.writeText(orderConfirmation.orderId)}
            >
              <Copy className="h-4 w-4" />
              Copy Order ID
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation Sent */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Email Sent</p>
                  <p className="text-sm text-muted-foreground">{orderConfirmation.customer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">SMS Sent</p>
                  <p className="text-sm text-muted-foreground">{orderConfirmation.customer.phone}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pickup Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
              Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{pickupLocation.name}</p>
            <p className="text-muted-foreground text-sm">
              {pickupLocation.address}, {pickupLocation.city}, {pickupLocation.state} {pickupLocation.zip}
            </p>
            {pickupLocation.phone && (
              <Button variant="link" className="p-0 h-auto mt-2" asChild>
                <a href={`tel:${pickupLocation.phone}`}>
                  <Phone className="h-4 w-4 mr-1" />
                  {pickupLocation.phone}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* What to Bring */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3">What to bring:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Valid government-issued ID (21+)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                This QR code (on your phone or printed)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Payment method (cash, debit, or card)
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {brandLogo ? (
            <div className="relative h-10 w-10">
              <Image
                src={brandLogo}
                alt={brandName}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Leaf className="h-6 w-6 text-white" />
            </div>
          )}
          <span className="font-bold text-xl">{brandName}</span>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        {step === 'review' && renderReviewStep()}
        {step === 'contact' && renderContactStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </section>
  );
}
