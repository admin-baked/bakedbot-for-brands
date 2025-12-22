import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { PricingUI } from "./pricing-ui";

export const metadata: Metadata = {
    title: "Pricing | BakedBot AI",
    description: "Simple, transparent pricing for cannabis brands and dispensaries. Start with discovery, upgrade to automation.",
};

export default function PricingPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
                <PricingUI />
            </main>
            <LandingFooter />
        </div>
    );
}
