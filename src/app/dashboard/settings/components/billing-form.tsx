
// src/app/dashboard/settings/components/billing-form.tsx
"use client";

import { useState, useMemo } from "react";
import { PLANS, PlanId, computeMonthlyAmount, COVERAGE_PACKS, CoveragePackId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAcceptJs } from "@/hooks/useAcceptJs";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface BillingFormProps {
  organizationId: string;
  locationCount: number;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerZip?: string;
}

export function BillingForm(props: BillingFormProps) {
  const { organizationId, locationCount } = props;
  const { toast } = useToast();

  const [planId, setPlanId] = useState<PlanId>("claim_pro");
  const [selectedPacks, setSelectedPacks] = useState<CoveragePackId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize Accept.js
  const { isLoaded: isAcceptLoaded, tokenizeCard, error: acceptError, retryLoad } = useAcceptJs({
    clientKey: process.env.NEXT_PUBLIC_AUTHNET_CLIENT_KEY || "",
    apiLoginId: process.env.NEXT_PUBLIC_AUTHNET_API_LOGIN_ID || "",
  });

  const amount = useMemo(() => {
    try {
      if (planId === "enterprise") return 0;
      return computeMonthlyAmount(planId, locationCount, selectedPacks);
    } catch {
      return 0;
    }
  }, [planId, locationCount, selectedPacks]);

  // Basic card form; in production you might use Accept Hosted instead
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // MMYY
  const [cvv, setCvv] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (planId === "enterprise") {
      toast({
        title: "Enterprise plan",
        description: "We’ll contact you to finalize an enterprise agreement.",
      });
      return;
    }

    if (amount === 0) {
      // Hit the API to register free plan, no card
      setIsSubmitting(true);
      try {
        const resp = await fetch("/api/billing/authorize-net", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            planId,
            locationCount,
          }),
        });

        const json = await resp.json();

        if (!resp.ok || !json.success) {
          throw new Error(json.error || "Failed to activate free plan");
        }

        toast({
          title: "Free plan activated",
          description: "You’re now on the Free plan.",
        });

        // TODO: refresh subscription state from Firestore
      } catch (err: any) {
        toast({
          title: "Error",
          description: err?.message || "Failed to update plan",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    // Paid plans require card + Accept.js
    if (!isAcceptLoaded) {
      toast({
        title: "Payment library not loaded",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!cardNumber || !expiry || !cvv) {
      toast({
        title: "Missing card details",
        description: "Enter your card number, expiry, and CVV.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Tokenize Card
      const [expMonth, expYear] = [expiry.slice(0, 2), expiry.slice(2)];
      
      const opaqueData = await tokenizeCard({
        cardNumber,
        expirationMonth: expMonth,
        expirationYear: expYear,
        cvv,
      });

      // 2. Send to Backend
      const resp = await fetch("/api/billing/authorize-net", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          planId,
          locationCount,
          coveragePackIds: selectedPacks,
          opaqueData,
          customer: {
            fullName: props.customerName || "",
            email: props.customerEmail || "",
            company: props.customerCompany || "",
            zip: props.customerZip || "",
          },
        }),
      });

      const json = await resp.json();

      if (!resp.ok || !json.success) {
        throw new Error(json.error || "Subscription setup failed");
      }

      toast({
        title: "Subscription active",
        description: `You’re now on the ${PLANS[planId].name} plan – $${amount}/month.`,
      });

      // TODO: after Firestore save, re-fetch subscription info
    } catch (err: any) {
      logger.error("Subscription error", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to create subscription",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground">
          Choose your plan based on active locations. Authorize.Net handles the monthly billing.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <Label className="text-sm">Choose your plan</Label>
          <RadioGroup value={planId} onValueChange={(v) => setPlanId(v as PlanId)}>
            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-lg border p-3 space-x-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={plan.id} id={`plan-${plan.id}`} />
                  <div>
                    <Label htmlFor={`plan-${plan.id}`} className="font-medium">
                      {plan.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                {plan.id !== "enterprise" && (
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ${computeMonthlyAmount(plan.id, locationCount).toFixed(2)}/mo
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.includedLocations} locations included
                      {plan.extraPerLocation
                        ? `, $${plan.extraPerLocation}/mo each extra`
                        : ""}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </RadioGroup>
        </div>


        {planId !== "free" && planId !== "enterprise" && (
          <div className="space-y-3">
            <Label className="text-sm">Optional Add-ons</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.values(COVERAGE_PACKS).map(pack => (
                <div key={pack.id} className="flex items-start space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id={pack.id}
                    checked={selectedPacks.includes(pack.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedPacks([...selectedPacks, pack.id]);
                      else setSelectedPacks(selectedPacks.filter(id => id !== pack.id));
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={pack.id} className="font-medium cursor-pointer">
                      {pack.name} (+${pack.amount}/mo)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {pack.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {planId !== "free" && planId !== "enterprise" && (
          <div className="space-y-4">
            <Label className="text-sm">Payment details</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input
                  id="cardNumber"
                  data-testid="card-input"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4111 1111 1111 1111"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expiry">Expiry (MMYY)</Label>
                <Input
                  id="expiry"
                  data-testid="expiry-input"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  placeholder="0527"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="password"
                  data-testid="cvv-input"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  placeholder="123"
                />
              </div>
            </div>
          </div>
        )}

        {/* Script Load Error */}
        {acceptError && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span className="font-medium">Payment System Error</span>
            </div>
            <p className="text-sm">{acceptError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retryLoad}
              className="mt-2"
            >
              Retry Loading
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Active locations: <span className="font-semibold">{locationCount}</span>
            {planId !== "enterprise" && (
              <>
                <br />
                Billed monthly:{" "}
                <span className="font-semibold">
                  ${amount.toFixed(2)}
                </span>
              </>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Update subscription"}
          </Button>
        </div>
      </form>
    </Card >
  );
}
