
'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/hooks/use-store';
import { useUser } from '@/firebase/auth/use-user';
import { submitOrder, type ClientOrderInput } from '@/app/checkout/actions/submitOrder';
import { useTransition, useEffect, useState } from 'react';
import { Loader2, Send, Sparkles, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import type { Retailer } from '@/firebase/converters';
import { useToast } from '@/hooks/use-toast';
import { DEMO_BRAND_ID } from '@/lib/config';
import { checkFirstOrderEligibility } from '@/lib/checkout/first-order-discount';
import { createFirstOrderCoupon } from '@/app/actions/first-order-coupon';

import { logger } from '@/lib/logger';
const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?[\s-]?(\d{3})[\s-]?(\d{4})$/
);

const checkoutSchema = z.object({
  customerName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  customerEmail: z.string().email({ message: 'Please enter a valid email.' }),
  customerPhone: z.string().regex(phoneRegex, 'Invalid phone number'),
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  onOrderSuccess: (orderId: string, userId?: string) => void;
  selectedRetailer: Retailer;
  couponCode?: string;
}

export function CheckoutForm({ onOrderSuccess, selectedRetailer, couponCode }: CheckoutFormProps) {
  const { user } = useUser();
  const { cartItems, clearCart } = useStore();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [firstOrderDiscount, setFirstOrderDiscount] = useState<{
    code: string;
    percent: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      emailOptIn: false,
      smsOptIn: false,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        customerName: user.displayName || '',
        customerEmail: user.email || '',
        customerPhone: user.phoneNumber || '',
        emailOptIn: false,
        smsOptIn: false,
      });
    }
  }, [user, form]);

  // Check first-order discount eligibility on email blur
  const handleEmailBlur = async () => {
    const email = form.getValues('customerEmail');
    if (!email || checkingEligibility || firstOrderDiscount) return;

    const orgId = cartItems[0]?.brandId || DEMO_BRAND_ID;
    setCheckingEligibility(true);

    try {
      const eligibility = await checkFirstOrderEligibility(email, orgId);
      if (eligibility.eligible && eligibility.discountCode) {
        // Create the coupon
        await createFirstOrderCoupon(eligibility.discountCode, orgId);

        setFirstOrderDiscount({
          code: eligibility.discountCode,
          percent: eligibility.discountPercent
        });

        toast({
          title: "🎉 First Order Discount Applied!",
          description: `${eligibility.discountPercent}% off! Code: ${eligibility.discountCode}`
        });
      }
    } catch (error) {
      logger.error('[CheckoutForm] Error checking discount eligibility', { error });
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleCopyCode = () => {
    if (firstOrderDiscount?.code) {
      navigator.clipboard.writeText(firstOrderDiscount.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Code copied!", description: "Paste it at checkout if needed" });
    }
  };


  const onSubmit = (data: CheckoutFormValues) => {
    if (cartItems.length === 0) {
      toast({ variant: 'destructive', title: 'Your cart is empty!' });
      return;
    }

    startTransition(async () => {
      // The first item in the cart determines the brand for the whole order.
      const organizationId = cartItems[0]?.brandId || DEMO_BRAND_ID;

      const orderInput: ClientOrderInput = {
        items: cartItems,
        customer: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
        retailerId: selectedRetailer.id,
        organizationId: organizationId,
        couponCode: firstOrderDiscount?.code || couponCode || undefined,
      };

      try {
        const result = await submitOrder(orderInput);

        if (result.ok && result.orderId) {
          clearCart();
          onOrderSuccess(result.orderId, result.userId);
        } else {
          toast({ variant: 'destructive', title: 'Order Submission Failed', description: result.error || 'Could not submit order. Please try again.' });
        }
      } catch (e) {
        logger.error("submitOrder failed:", e instanceof Error ? e : new Error(String(e)));
        const errorMessage = e instanceof Error ? e.message : String(e);
        toast({ variant: 'destructive', title: 'Order Submission Failed', description: errorMessage });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jane.doe@example.com"
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          handleEmailBlur();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* First-Order Discount Display */}
            {firstOrderDiscount && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <p className="font-semibold text-emerald-800">Welcome Discount Applied!</p>
                </div>
                <p className="text-sm text-emerald-700">
                  You're getting {firstOrderDiscount.percent}% off your first order
                </p>
                <div className="flex items-center justify-between bg-white p-3 rounded-md">
                  <code className="font-mono font-bold text-lg">{firstOrderDiscount.code}</code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Marketing Opt-in Checkboxes */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">Stay in the loop (optional)</p>
              <FormField
                control={form.control}
                name="emailOptIn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Email me about exclusive deals and new products
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smsOptIn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Text me about flash sales and special events
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Message & data rates may apply. Reply STOP to opt out.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />}
              Place Order
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
