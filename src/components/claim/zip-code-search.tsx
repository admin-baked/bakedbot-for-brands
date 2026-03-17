"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Check, Loader2, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClaimOpportunity } from "@/server/actions/claim-opportunities";

export interface AuditContext {
  auditReportId: string;
  emailLeadId: string;
  email: string;
  firstName?: string;
  businessType: "dispensary" | "brand";
  state: string;
  websiteUrl: string;
  score: number;
  findability?: number;
}

interface ZipCodeSearchProps {
  className?: string;
  autoFocus?: boolean;
  auditContext?: AuditContext;
}

export function ZipCodeSearch({ className, autoFocus = false, auditContext }: ZipCodeSearchProps) {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "reservable" | "waitlist" | "submitted">("idle");
  const [searchedZip, setSearchedZip] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length !== 5) return;

    setStatus("loading");
    setSearchedZip(zip);

    // V1: conservative — all ZIPs are reservable until real availability logic exists
    setTimeout(() => {
      setStatus("reservable");
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
    setZip(val);
    if (status !== "idle" && val !== searchedZip) {
      setStatus("idle");
    }
  };

  return (
    <div className={cn("w-full max-w-lg mx-auto", className)}>
      <form onSubmit={handleSearch} className="mb-6 relative">
        <div className="relative flex items-center">
            <MapPin className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input 
                value={zip} 
                onChange={handleChange}
                placeholder="Enter your ZIP Code..." 
                className="h-14 pl-12 pr-32 text-lg shadow-lg border-2 focus-visible:ring-offset-2 transition-all"
                autoFocus={autoFocus}
                maxLength={5}
            />
            <div className="absolute right-2 top-2 bottom-2">
                 <Button 
                    type="submit" 
                    disabled={zip.length < 5 || status === 'loading'} 
                    className={cn("h-full px-6 transition-all", status === 'reservable' ? 'bg-emerald-600 hover:bg-emerald-700' : '')}
                >
                    {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Check Availability"}
                </Button>
            </div>
        </div>
      </form>

      {status === "loading" && (
        <div className="text-center animate-in fade-in zoom-in duration-300">
             <div className="inline-flex items-center gap-2 text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning territory network...
            </div>
        </div>
      )}

      {status === "reservable" && (
        <Card className="border-2 border-emerald-500/20 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <div className="bg-emerald-500/10 p-2 text-center border-b border-emerald-500/20">
                <p className="text-emerald-700 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Territory Available
                </p>
            </div>

            <CardContent className="pt-6 pb-6 text-center">
                <h3 className="text-2xl font-bold mb-2">
                    {searchedZip} is available.
                </h3>
                <p className="text-muted-foreground mb-6">
                    Reserve this territory and we'll build 50+ local SEO pages that funnel search traffic exclusively to you.
                </p>

                <div className="bg-amber-100 text-amber-800 border-amber-200 border rounded-lg p-3 text-sm mb-6 flex items-start gap-2 text-left">
                     <Users className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                     <span>
                        <strong>Limited slots:</strong> Only one partner per ZIP. Reserve before a competitor does.
                     </span>
                </div>

                <Button
                    size="lg"
                    className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20"
                    disabled={claimLoading}
                    onClick={async () => {
                        if (auditContext) {
                            setClaimLoading(true);
                            try {
                                const result = await createClaimOpportunity({
                                    source: 'fff_audit',
                                    sourceDetail: 'free_audit_unlock',
                                    auditReportId: auditContext.auditReportId,
                                    emailLeadId: auditContext.emailLeadId,
                                    claimant: {
                                        email: auditContext.email,
                                        firstName: auditContext.firstName,
                                        businessType: auditContext.businessType,
                                        websiteUrl: auditContext.websiteUrl || undefined,
                                    },
                                    opportunityType: auditContext.businessType === 'brand' ? 'brand_footprint_claim' : 'zip_claim',
                                    market: { zip: searchedZip, state: auditContext.state },
                                    auditSnapshot: {
                                        totalScore: auditContext.score,
                                        findability: auditContext.findability,
                                    },
                                });
                                if (result.success) {
                                    setStatus("submitted");
                                    return;
                                }
                            } finally {
                                setClaimLoading(false);
                            }
                        }
                        router.push(`/get-started?plan=signal&zip=${searchedZip}${auditContext ? `&auditReportId=${auditContext.auditReportId}` : ''}`);
                    }}
                >
                    {claimLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Reserve This Territory <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                    A BakedBot specialist will reach out to confirm your territory.
                </p>
            </CardContent>
        </Card>
      )}

      {status === "submitted" && (
        <Card className="border-2 border-emerald-500/20 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-800">
                    {searchedZip} is reserved.
                </h3>
                <p className="text-muted-foreground mb-2">
                    Your territory request is in. A BakedBot specialist will reach out to confirm your ZIP and get your pages live.
                </p>
            </CardContent>
        </Card>
      )}

      {status === "waitlist" && (
        <Card className="border-amber-100 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-800">
                    {searchedZip} is currently taken.
                </h3>
                <p className="text-muted-foreground mb-6">
                    Another partner has this territory. You're on the waitlist — we'll notify you if it opens up.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
