'use client';

import { useState, useMemo } from 'react';
import { captureNYLead } from '@/server/actions/ny-lead-capture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    CheckCircle2,
    Calculator,
    DollarSign,
    TrendingUp,
    Users,
    Palette,
    Target,
} from 'lucide-react';

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

export default function ROICalculatorPage() {
    // Calculator inputs
    const [dailyCustomers, setDailyCustomers] = useState(150);
    const [avgTicket, setAvgTicket] = useState(65);
    const [productCount, setProductCount] = useState(200);
    const [monthlyDesignSpend, setMonthlyDesignSpend] = useState(500);

    // Lead capture
    const [email, setEmail] = useState('');
    const [dispensaryName, setDispensaryName] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // ROI calculations
    const roi = useMemo(() => {
        const monthlyRevenue = dailyCustomers * avgTicket * 30;

        // Dynamic pricing: typically 3-8% revenue lift from price optimization
        const pricingLift = monthlyRevenue * 0.04;

        // Budtender upsell: 5-15% ticket increase from AI recommendations
        const upsellLift = dailyCustomers * avgTicket * 0.08 * 30;

        // Marketing automation: saves 10-20 hours/month of staff time at ~$25/hr
        const marketingSavings = 15 * 25;

        // Creative savings: reduces design costs by 60-80%
        const creativeSavings = monthlyDesignSpend * 0.7;

        // Compliance: avoid $5K-$50K fines (avg $2K/month risk reduction)
        const complianceSavings = 2000;

        // Competitive intel value: early reaction to market changes
        const intelValue = monthlyRevenue * 0.01;

        const totalMonthlyValue = pricingLift + upsellLift + marketingSavings + creativeSavings + complianceSavings + intelValue;
        const annualValue = totalMonthlyValue * 12;

        // BakedBot Growth tier cost
        const monthlyCost = 349;
        const roiMultiple = totalMonthlyValue / monthlyCost;

        return {
            monthlyRevenue,
            pricingLift,
            upsellLift,
            marketingSavings,
            creativeSavings,
            complianceSavings,
            intelValue,
            totalMonthlyValue,
            annualValue,
            monthlyCost,
            roiMultiple,
        };
    }, [dailyCustomers, avgTicket, monthlyDesignSpend]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !dispensaryName.trim()) {
            setError('Email and dispensary name are required');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await captureNYLead({
                email: email.trim(),
                dispensaryName: dispensaryName.trim(),
                source: 'roi-calculator',
                emailConsent: true,
                metadata: {
                    dailyCustomers,
                    avgTicket,
                    productCount,
                    monthlyDesignSpend,
                    estimatedMonthlyROI: roi.totalMonthlyValue,
                    roiMultiple: roi.roiMultiple,
                },
            });
            if (!result.success) throw new Error(result.error);
            setSuccess(true);
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 max-w-6xl">
            {/* Hero */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
                    <Calculator className="w-4 h-4" />
                    Interactive ROI Calculator
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-teko uppercase">
                    What&apos;s Your Dispensary<br />
                    <span className="text-emerald-600">Leaving on the Table?</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Enter your numbers below. See exactly how much revenue and savings
                    AI-powered operations can unlock for your dispensary.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <h2 className="text-xl font-bold mb-6">Your Dispensary Numbers</h2>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="dailyCustomers" className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                Average Daily Customers
                            </Label>
                            <Input
                                id="dailyCustomers"
                                type="number"
                                min={1}
                                value={dailyCustomers}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDailyCustomers(Number(e.target.value) || 0)}
                            />
                            <input
                                type="range"
                                min={50}
                                max={500}
                                step={10}
                                value={dailyCustomers}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDailyCustomers(Number(e.target.value))}
                                className="w-full accent-emerald-600"
                            />
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>50</span>
                                <span>500</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="avgTicket" className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-slate-400" />
                                Average Transaction ($)
                            </Label>
                            <Input
                                id="avgTicket"
                                type="number"
                                min={1}
                                value={avgTicket}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvgTicket(Number(e.target.value) || 0)}
                            />
                            <input
                                type="range"
                                min={20}
                                max={150}
                                step={5}
                                value={avgTicket}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvgTicket(Number(e.target.value))}
                                className="w-full accent-emerald-600"
                            />
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>$20</span>
                                <span>$150</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="productCount" className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-slate-400" />
                                Active SKU Count
                            </Label>
                            <Input
                                id="productCount"
                                type="number"
                                min={1}
                                value={productCount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductCount(Number(e.target.value) || 0)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="designSpend" className="flex items-center gap-2">
                                <Palette className="w-4 h-4 text-slate-400" />
                                Monthly Design/Creative Spend ($)
                            </Label>
                            <Input
                                id="designSpend"
                                type="number"
                                min={0}
                                value={monthlyDesignSpend}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyDesignSpend(Number(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
                        <strong>Your current monthly revenue:</strong>{' '}
                        {formatCurrency(roi.monthlyRevenue)}
                    </div>
                </div>

                {/* Results */}
                <div>
                    <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 mb-6">
                        <h2 className="text-xl font-bold mb-2">Estimated Monthly Impact</h2>
                        <div className="text-4xl font-bold text-emerald-700 mb-1">
                            {formatCurrency(roi.totalMonthlyValue)}
                            <span className="text-lg font-normal text-emerald-600">/mo</span>
                        </div>
                        <div className="text-sm text-emerald-600 mb-6">
                            {roi.roiMultiple.toFixed(1)}x return on {formatCurrency(roi.monthlyCost)}/mo investment
                        </div>

                        <div className="space-y-3">
                            <ROILine
                                icon={<TrendingUp className="w-4 h-4" />}
                                label="Dynamic Pricing Lift (Money Mike)"
                                value={roi.pricingLift}
                                color="emerald"
                            />
                            <ROILine
                                icon={<Users className="w-4 h-4" />}
                                label="Budtender Upsell (Smokey AI)"
                                value={roi.upsellLift}
                                color="blue"
                            />
                            <ROILine
                                icon={<Target className="w-4 h-4" />}
                                label="Marketing Automation (Craig)"
                                value={roi.marketingSavings}
                                color="purple"
                            />
                            <ROILine
                                icon={<Palette className="w-4 h-4" />}
                                label="Creative Cost Savings"
                                value={roi.creativeSavings}
                                color="amber"
                            />
                            <ROILine
                                icon={<DollarSign className="w-4 h-4" />}
                                label="Compliance Risk Reduction"
                                value={roi.complianceSavings}
                                color="red"
                            />
                            <ROILine
                                icon={<TrendingUp className="w-4 h-4" />}
                                label="Competitive Intel Value"
                                value={roi.intelValue}
                                color="slate"
                            />
                        </div>

                        <div className="mt-6 pt-4 border-t border-emerald-200">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-emerald-800">Annual Value</span>
                                <span className="text-2xl font-bold text-emerald-700">{formatCurrency(roi.annualValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    {!showForm && !success ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 text-center">
                            <h3 className="font-bold mb-2">Ready to Prove It?</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Start a 60-day pilot and validate these numbers with your own data.
                            </p>
                            <Button onClick={() => setShowForm(true)} className="w-full h-12">
                                <Calculator className="w-4 h-4 mr-2" />
                                Get Your Personalized ROI Report
                            </Button>
                        </div>
                    ) : success ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                            <h3 className="font-bold mb-2">Report Coming Your Way!</h3>
                            <p className="text-sm text-slate-600">
                                We&apos;ll send your personalized ROI breakdown to <strong>{email}</strong> with
                                next steps to start your pilot.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
                            <h3 className="font-bold mb-4">Send Me the Full Report</h3>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="dispensaryName2">Dispensary Name *</Label>
                                    <Input
                                        id="dispensaryName2"
                                        placeholder="Your dispensary"
                                        value={dispensaryName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDispensaryName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="email2">Work Email *</Label>
                                    <Input
                                        id="email2"
                                        type="email"
                                        placeholder="you@dispensary.com"
                                        value={email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Calculator className="w-4 h-4 mr-2" />
                                    )}
                                    {isLoading ? 'Sending...' : 'Send My ROI Report'}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ROILine({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        emerald: 'text-emerald-600',
        blue: 'text-blue-600',
        purple: 'text-purple-600',
        amber: 'text-amber-600',
        red: 'text-red-600',
        slate: 'text-slate-600',
    };
    return (
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm">
                <span className={colorMap[color] || 'text-slate-600'}>{icon}</span>
                <span className="text-slate-700">{label}</span>
            </div>
            <span className="font-semibold text-emerald-700">
                +{formatCurrency(value)}
            </span>
        </div>
    );
}
