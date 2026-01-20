"use client";

import { useState } from "react";
import { Search, MapPin, Check, Loader2, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ZipCodeSearchProps {
  className?: string;
  autoFocus?: boolean;
}

export function ZipCodeSearch({ className, autoFocus = false }: ZipCodeSearchProps) {
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "available" | "taken">("idle");
  const [searchedZip, setSearchedZip] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length !== 5) return;

    setStatus("loading");
    setSearchedZip(zip);

    // Mock API call delay
    setTimeout(() => {
      // Mock logic: 90% chance available for demo purposes
      const isAvailable = true; 
      setStatus(isAvailable ? "available" : "taken");
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
                    className={cn("h-full px-6 transition-all", status === 'available' ? 'bg-emerald-600 hover:bg-emerald-700' : '')}
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

      {status === "available" && (
        <Card className="border-2 border-emerald-500/20 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
             
            <div className="bg-emerald-500/10 p-2 text-center border-b border-emerald-500/20">
                <p className="text-emerald-700 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Territory Available
                </p>
            </div>

            <CardContent className="pt-6 pb-6 text-center">
                <h3 className="text-2xl font-bold mb-2">
                    {searchedZip} is unclaimed!
                </h3>
                <p className="text-muted-foreground mb-6">
                    You can be the exclusive Pro partner for this territory.
                </p>

                <div className="bg-amber-100 text-amber-800 border-amber-200 border rounded-lg p-3 text-sm mb-6 flex items-start gap-2 text-left">
                     <Users className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                     <span>
                        <strong>High Demand:</strong> 82 people searched for "dispensary" in this area last week. Claim this traffic before a competitor does.
                     </span>
                </div>

                <Button size="lg" className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20" asChild>
                    <Link href={`/checkout/subscription?plan=claim_pro&zip=${searchedZip}`}>
                        Claim Territory for $99 <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                    30-day money-back guarantee. Cancel anytime.
                </p>
            </CardContent>
        </Card>
      )}

       {status === "taken" && (
        <Card className="border-red-100 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
             <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-800">
                    {searchedZip} is currently taken.
                </h3>
                <p className="text-muted-foreground mb-6">
                   Another dispensary has claimed this territory. Join the waitlist to be notified if it becomes available.
                </p>
                 <Button variant="outline" className="w-full">
                    Join Waitlist
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
