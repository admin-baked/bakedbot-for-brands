
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationStatus } from "@/types/seo-engine";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Crown, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StickyOperatorBoxProps {
    entityName: string;
    entityType: 'brand' | 'dispensary';
    verificationStatus: VerificationStatus;
    className?: string;
}

export function StickyOperatorBox({ entityName, entityType, verificationStatus, className }: StickyOperatorBoxProps) {
    const isUnverified = verificationStatus === 'unverified';
    const isVerified = verificationStatus === 'verified';
    const isFeatured = verificationStatus === 'featured';

    return (
        <Card className={cn("sticky top-20 border-l-4 shadow-md", className, {
            "border-l-yellow-500": isUnverified,
            "border-l-blue-500": isVerified,
            "border-l-purple-500": isFeatured
        })}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                        Own {entityName}?
                    </CardTitle>
                    {isFeatured && <Badge className="bg-purple-600"><Crown className="w-3 h-3 mr-1" /> Featured</Badge>}
                    {isVerified && <Badge className="bg-blue-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>}
                    {isUnverified && <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50"><ShieldAlert className="w-3 h-3 mr-1" /> Unclaimed</Badge>}
                </div>
                <CardDescription className="text-xs">
                    {isUnverified && "Claim this page to control your brand presence, update links, and view analytics."}
                    {isVerified && "Upgrade to Featured to pin your brand on local ZIP pages and rankings."}
                    {isFeatured && "You are viewing your featured page preview."}
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 space-y-2">
                <ul className="text-xs space-y-1 text-muted-foreground">
                    <li className="flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-2 text-green-500" />
                        {isUnverified ? "Update Logo & Links" : "Manage Products"}
                    </li>
                    <li className="flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-2 text-green-500" />
                        {isUnverified ? "See Footprint Data" : "Detailed Analytics"}
                    </li>
                    <li className="flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-2 text-green-500" />
                        {isUnverified ? "Get Verified Badge" : "Priority Support"}
                    </li>
                </ul>
            </CardContent>
            <CardFooter>
                {isUnverified && (
                    <Button asChild className="w-full bg-yellow-600 hover:bg-yellow-700 text-white" size="sm">
                        <Link href={`/brands/claim?name=${encodeURIComponent(entityName)}`}>
                            Claim This Page
                        </Link>
                    </Button>
                )}
                {isVerified && (
                    <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                        <Link href={`/dashboard/brand/growth`}>
                            Get Featured ($100/mo)
                        </Link>
                    </Button>
                )}
                {isFeatured && (
                    <Button asChild variant="outline" className="w-full" size="sm">
                        <Link href={`/dashboard/brand`}>
                            Manage Page
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
