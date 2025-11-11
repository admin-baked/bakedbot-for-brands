
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
import { useCart } from '@/hooks/use-cart';
import { useUser } from '@/firebase/auth/use-user';
import { submitOrder, type OrderInput } from '@/app/checkout/actions/submitOrder';
import { useTransition, useEffect } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import type { Location } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?[\s-]?(\d{3})[\s-]?(\d{4})$/
);

const checkoutSchema = z.object({
  customerName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  customerEmail: z.string().email({ message: 'Please enter a valid email.' }),
  customerPhone: z.string().regex(phoneRegex, 'Invalid phone number'),
  customerBirthDate: z.string().refine((date) => {
    if (!date) return false;
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 21;
  }, { message: 'You must be at least 21 years old.' }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  onOrderSuccess: (orderId: string, userId?: string) => void;
  selectedLocation: Location;
}

export function CheckoutForm({ onOrderSuccess, selectedLocation }: CheckoutFormProps) {
  const { user } = useUser();
  const { items: cart, getCartTotal } = useCart();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerBirthDate: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        customerName: user.displayName || '',
        customerEmail: user.email || '',
        customerPhone: user.phoneNumber || '',
        customerBirthDate: '',
      });
    }
  }, [user, form]);


  const onSubmit = (data: CheckoutFormValues) => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Your cart is empty!' });
      return;
    }
    
    startTransition(async () => {
      const { subtotal, taxes, total } = getCartTotal();
      
      const orderInput: OrderInput = {
        items: cart.map(item => ({
            productId: item.id,
            name: item.name,
            qty: item.quantity,
            price: item.price
        })),
        totals: {
            subtotal,
            tax: taxes,
            total
        },
        customer: {
            name: data.customerName,
            email: data.customerEmail
        },
        locationId: selectedLocation.id,
      };

      try {
        const result = await submitOrder(orderInput);

        if (result.ok && result.orderId) {
          onOrderSuccess(result.orderId, user?.uid);
        } else {
          toast({ variant: 'destructive', title: 'Order Submission Failed', description: result.error || 'Could not submit order. Please try again.' });
        }
      } catch (e) {
          console.error("submitOrder failed:", e);
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
                      <Input type="email" placeholder="jane.doe@example.com" {...field} />
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
            <FormField
              control={form.control}
              name="customerBirthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
