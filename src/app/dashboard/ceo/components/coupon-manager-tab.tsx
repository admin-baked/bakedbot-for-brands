
'use client';

import { useFormState } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCoupon, getBrands, getCoupons, type ActionResult } from '../actions';
import { SubmitButton } from './submit-button';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type Coupon } from '@/firebase/converters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DollarSign, Percent } from 'lucide-react';
import { DEMO_BRAND_ID } from '@/lib/config';
import type { Brand } from '@/types/domain';
import { useMockData } from '@/hooks/use-mock-data';

const initialState: ActionResult = { message: '', error: false };

export default function CouponManagerTab() {

  const { toast } = useToast();
  const { isMock } = useMockData();
  const [formState, formAction] = useFormState(createCoupon, initialState);

  // Fetch coupons via Server Action to avoid Permission Denied
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);

  useEffect(() => {
    async function loadCoupons() {
      if (isMock) {
        setCoupons([]); // Or some mock coupons
        setCouponsLoading(false);
        return;
      }
      try {
        const fetchedCoupons = await getCoupons();
        setCoupons(fetchedCoupons);
      } catch (err) {
        console.error('Failed to load coupons:', err);
        toast({
          title: 'Error',
          description: 'Failed to load coupons.',
          variant: 'destructive',
        });
      } finally {
        setCouponsLoading(false);
      }
    }
    loadCoupons();
  }, [isMock, toast]);

  // Fetch brands via Server Action to avoid Permission Denied (auth: null)
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  useEffect(() => {
    async function loadBrands() {
      if (isMock) {
        setBrands([{ id: DEMO_BRAND_ID, name: 'BakedBot Demo Brand' }]);
        setBrandsLoading(false);
        return;
      }

      try {
        const fetchedBrands = await getBrands();
        setBrands(fetchedBrands.length > 0 ? fetchedBrands : [{ id: DEMO_BRAND_ID, name: 'BakedBot Demo Brand' }]);
      } catch (err) {
        console.error('Failed to load brands:', err);
        toast({
          title: 'Warning',
          description: 'Could not load brands. Using demo data.',
          variant: 'destructive',
        });
        setBrands([{ id: DEMO_BRAND_ID, name: 'BakedBot Demo Brand' }]);
      } finally {
        setBrandsLoading(false);
      }
    }

    loadBrands();
  }, [isMock, toast]);

  useEffect(() => {
    if (formState.message) {
      toast({
        title: formState.error ? 'Error' : 'Success',
        description: formState.message,
        variant: formState.error ? 'destructive' : 'default',
      });
    }
  }, [formState, toast]);

  const brandsMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set(DEMO_BRAND_ID, 'BakedBot (Default)');
    brands?.forEach(brand => map.set(brand.id, brand.name));
    return map;
  }, [brands]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Create New Coupon</CardTitle>
              <CardDescription>Define a new coupon code for a specific brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <Input id="code" name="code" placeholder="e.g., LAUNCH20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandId">Brand</Label>
                  <Select name="brandId" disabled={brandsLoading}>
                    <SelectTrigger id="brandId">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(brandsMap.entries()).map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Discount Type</Label>
                  <Select name="type" defaultValue="percentage">
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input id="value" name="value" type="number" placeholder="e.g., 20" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <SubmitButton label="Create Coupon" />
            </CardFooter>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Coupons</CardTitle>
          <CardDescription>A list of all active and expired coupons.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Uses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couponsLoading && <tr><TableCell colSpan={4} className="text-center">Loading...</TableCell></tr>}
              {!couponsLoading && coupons?.length === 0 && <tr><TableCell colSpan={4} className="text-center">No coupons created yet.</TableCell></tr>}
              {coupons?.map(coupon => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono">{coupon.code}</TableCell>
                  <TableCell className="text-xs">{brandsMap.get(coupon.brandId) ?? coupon.brandId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {coupon.type === 'fixed' ? <DollarSign className="h-3 w-3" /> : <Percent className="h-3 w-3" />}
                      {coupon.value}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{coupon.uses}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
