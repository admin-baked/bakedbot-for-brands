
'use client';

import { useActionState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCoupon, getCoupons, toggleCouponActive } from '../actions/system-actions';
import { type ActionResult } from '../actions/types';
import { SubmitButton } from './submit-button';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Percent, Power } from 'lucide-react';
import { format } from 'date-fns';
import { useMockData } from '@/hooks/use-mock-data';

const initialState: ActionResult = { message: '', error: false };

const PLATFORM_TARGET = 'platform';

interface CouponRow {
  id: string;
  code: string;
  brandId: string;
  type: 'percentage' | 'fixed';
  value: number;
  uses: number;
  active: boolean;
  maxUses?: number;
  expiresAt?: Date | null;
}

export default function CouponManagerTab() {
  const { toast } = useToast();
  const { isMock } = useMockData();
  const [formState, formAction] = useActionState(createCoupon, initialState);

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadCoupons() {
    if (isMock) { setCoupons([]); setCouponsLoading(false); return; }
    try {
      const fetched = await getCoupons();
      setCoupons(fetched as CouponRow[]);
    } catch {
      toast({ title: 'Error', description: 'Failed to load coupons.', variant: 'destructive' });
    } finally {
      setCouponsLoading(false);
    }
  }

  useEffect(() => { loadCoupons(); }, [isMock]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formState.message) {
      toast({
        title: formState.error ? 'Error' : 'Success',
        description: formState.message,
        variant: formState.error ? 'destructive' : 'default',
      });
      if (!formState.error) loadCoupons(); // refresh table after create
    }
  }, [formState]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(coupon: CouponRow) {
    setTogglingId(coupon.id);
    try {
      const result = await toggleCouponActive(coupon.id, !coupon.active);
      toast({
        title: result.error ? 'Error' : 'Updated',
        description: result.message,
        variant: result.error ? 'destructive' : 'default',
      });
      if (!result.error) loadCoupons();
    } finally {
      setTogglingId(null);
    }
  }

  function targetLabel(brandId: string) {
    if (brandId === PLATFORM_TARGET || !brandId) return 'Platform';
    return brandId;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ── Create Form ── */}
      <div className="space-y-6">
        <Card>
          <form action={formAction}>
            <CardHeader>
              <CardTitle>Create New Coupon</CardTitle>
              <CardDescription>Platform coupons apply to any subscription plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <Input
                    id="code"
                    name="code"
                    placeholder="e.g., FOUNDER50"
                    required
                    minLength={3}
                    pattern="[A-Z0-9]+"
                    title="Uppercase letters and numbers only (min 3 chars)"
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-muted-foreground">Uppercase letters &amp; numbers only</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandId">Target</Label>
                  <Select name="brandId" defaultValue={PLATFORM_TARGET} required>
                    <SelectTrigger id="brandId">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PLATFORM_TARGET}>Platform (any plan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Discount Type</Label>
                  <Select name="type" defaultValue="percentage" required>
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
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    placeholder="e.g., 50"
                    required
                    min="0.01"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">50 = 50% off / 25 = $25 off</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max Uses <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="maxUses"
                    name="maxUses"
                    type="number"
                    placeholder="Unlimited"
                    min="1"
                    step="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="expiresAt"
                    name="expiresAt"
                    type="date"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <SubmitButton label="Create Coupon" />
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* ── Coupon Table ── */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Coupons</CardTitle>
          <CardDescription>Manage all active and inactive promo codes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {couponsLoading && (
                <tr><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></tr>
              )}
              {!couponsLoading && coupons.length === 0 && (
                <tr><TableCell colSpan={5} className="text-center text-muted-foreground">No coupons yet.</TableCell></tr>
              )}
              {coupons.map(coupon => (
                <TableRow key={coupon.id} className={!coupon.active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="font-mono font-semibold">{coupon.code}</div>
                    <div className="text-xs text-muted-foreground">{targetLabel(coupon.brandId)}</div>
                    {coupon.expiresAt && (
                      <div className="text-xs text-muted-foreground">
                        Exp {format(new Date(coupon.expiresAt), 'MMM d, yyyy')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {coupon.type === 'fixed' ? <DollarSign className="h-3 w-3" /> : <Percent className="h-3 w-3" />}
                      {coupon.value}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.uses}
                    {coupon.maxUses ? <span className="text-muted-foreground">/{coupon.maxUses}</span> : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.active ? 'default' : 'outline'}>
                      {coupon.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={coupon.active ? 'Deactivate' : 'Activate'}
                      disabled={togglingId === coupon.id}
                      onClick={() => handleToggle(coupon)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
