
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Facebook, Instagram, PenSquare, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Simplified Logo component for this page
const NaturesGraceLogo = () => (
    <div className="flex items-center gap-2">
        <svg width="100" height="40" viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#004B42]">
            <text x="5" y="35" fontFamily="serif" fontSize="30" fontWeight="bold" fill="currentColor">Nature's</text>
            <text x="35" y="48" fontFamily="serif" fontSize="20" fontWeight="bold" fill="currentColor">Grace</text>
        </svg>
    </div>
);

// Placeholder for the dispensary logos
const DispensaryLogo = ({ name, location, logoSrc, shopLink }: { name: string, location: string, logoSrc: string, shopLink: string }) => (
    <div className="flex flex-col items-center gap-4">
        <Image src={logoSrc} alt={`${name} logo`} width={120} height={60} className="object-contain" />
        <p className="text-center font-semibold text-lg text-primary-foreground/90">{location}</p>
        <Button variant="secondary" asChild className="bg-white/80 hover:bg-white text-primary font-bold">
            <Link href={shopLink}>SHOP {name.toUpperCase()}</Link>
        </Button>
    </div>
);

export default function ProductLocatorPage() {
    return (
        <div className="min-h-screen bg-[#F3EADF] text-[#004B42]">
            {/* Header */}
            <header className="bg-[#EBDDCC]">
                <div className="container mx-auto flex justify-between items-center p-4">
                    <NaturesGraceLogo />
                    <nav className="hidden md:flex items-center gap-6 font-semibold">
                        <Link href="#" className="hover:underline">Home</Link>
                        <Link href="#" className="hover:underline">About Us</Link>
                        <Link href="#" className="hover:underline">Our Brands</Link>
                        <Link href="#" className="hover:underline font-bold border-b-2 border-[#004B42]">Product Locator</Link>
                        <Link href="#" className="hover:underline">Our Partners</Link>
                        <Link href="#" className="hover:underline">Careers</Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main>
                <div className="bg-[#EBDDCC] py-12 px-4">
                    <div className="container mx-auto text-center max-w-4xl">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Where to Find Nature's Grace</h1>
                        <p className="mt-4 text-lg text-primary-foreground/80">
                            Use the tool below to see what's in stock at nearby dispensaries—updated in real time!
                        </p>
                        <p className="mt-6 text-base max-w-2xl mx-auto text-primary-foreground/70">
                            Just scroll down and use the filters or search bar to find your favorite Nature's Grace favorites like Funnies Gummies, Moonwalkers, Joos Vapes and more. Click the buttons below to go directly to dispensary menus.
                        </p>
                        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            <DispensaryLogo name="Trinity" location="Peoria - Glen & University" logoSrc="https://placehold.co/120x60/004b42/white?text=TRINITY" shopLink="#" />
                            <DispensaryLogo name="Bud & Rita's" location="Avondale, West Town, Niles, Wadsworth, Forsyth" logoSrc="https://placehold.co/120x60/f472b6/white?text=Bud+&+Rita's" shopLink="#" />
                            <DispensaryLogo name="Okay" location="Evanston" logoSrc="https://placehold.co/120x60/6366f1/white?text=OKAY" shopLink="#" />
                        </div>
                    </div>
                </div>

                {/* Embed Placeholder */}
                <div className="container mx-auto p-4 md:p-8">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6">
                        <div className="h-[800px] flex items-center justify-center bg-gray-50 rounded-md">
                            <p className="text-gray-500">Embed code for the product locator tool will live here.</p>
                        </div>
                    </div>
                </div>
                 {/* Leave a review callout */}
                <div className="bg-[#EBDDCC] py-12 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold">Have Feedback?</h2>
                        <p className="mt-2 text-primary-foreground/80">Loved a product? Let us know what you think!</p>
                        <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                            <Link href="/leave-a-review">
                                <PenSquare className="mr-2 h-4 w-4" />
                                Leave a Review
                            </Link>
                        </Button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#F3EADF] py-8 px-4">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col items-center md:items-start">
                        <NaturesGraceLogo />
                        <div className="flex items-center gap-4 mt-4">
                            <Instagram className="h-6 w-6 cursor-pointer hover:text-opacity-80" />
                            <Facebook className="h-6 w-6 cursor-pointer hover:text-opacity-80" />
                            <Twitter className="h-6 w-6 cursor-pointer hover:text-opacity-80" />
                        </div>
                    </div>
                    <nav className="flex flex-wrap justify-center md:justify-end items-center gap-x-6 gap-y-2 font-semibold">
                        <Link href="#" className="hover:underline">Home</Link>
                        <Link href="#" className="hover:underline">About Us</Link>
                        <Link href="#" className="hover:underline">Product Locator</Link>
                        <Link href="#" className="hover:underline">Careers</Link>
                        <Link href="#" className="hover:underline">Privacy Policy</Link>
                        <Link href="#" className="hover:underline">Terms of Use</Link>
                        <Link href="#" className="hover:underline">Contact Us</Link>
                    </nav>
                </div>
                <div className="container mx-auto text-center mt-6 border-t border-[#004B42]/20 pt-4">
                    <p className="text-sm text-[#004B42]/70">Copyright © 2025 Nature's Grace & Wellness</p>
                </div>
            </footer>
        </div>
    );
}
    
