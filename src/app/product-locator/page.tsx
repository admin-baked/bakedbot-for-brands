
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Facebook, Instagram, PenSquare, Twitter, Search, MapPin, Phone, Globe, Navigation, Building, Tag, Scale, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

// Simplified Logo component for this page
const NaturesGraceLogo = () => (
    <div className="flex items-center gap-2">
        <svg width="100" height="40" viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#004B42]">
            <text x="5" y="35" fontFamily="serif" fontSize="30" fontWeight="bold" fill="currentColor">Nature's</text>
            <text x="35" y="48" fontFamily="serif" fontSize="20" fontWeight="bold" fill="currentColor">Grace</text>
        </svg>
    </div>
);

const DispensaryCard = ({ name, address, phone }: { name: string, address: string, phone: string }) => (
    <Card className="bg-white/80 border-gray-300 shadow-md">
        <CardContent className="p-4 space-y-2">
            <h3 className="font-bold text-lg text-primary-foreground/95">{name}</h3>
            <div className="text-sm text-primary-foreground/80 space-y-1">
                <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{address}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{phone}</span>
                </div>
            </div>
            <div className="flex items-center justify-between pt-2">
                 <Button variant="secondary" className="bg-[#004B42] text-white hover:bg-[#004B42]/90 w-[calc(50%-0.25rem)]">
                    <Building className="mr-2 h-4 w-4" /> View Products
                 </Button>
                 <div className="flex items-center gap-1 w-1/2 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/70 hover:bg-gray-200"><Navigation className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/70 hover:bg-gray-200"><Globe className="h-4 w-4"/></Button>
                 </div>
            </div>
        </CardContent>
    </Card>
);

const ProductCard = ({ product, availableAt, savePercent }: { product: typeof products[0], availableAt: string, savePercent: number }) => (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        <div className="relative">
            <Image src={product.imageUrl} alt={product.name} width={400} height={400} className="object-cover w-full aspect-square" />
            <Badge variant="destructive" className="absolute top-2 left-2 bg-orange-500 text-white border-none">Save up to {savePercent}%</Badge>
        </div>
        <CardContent className="p-4">
            <h3 className="text-lg font-bold text-primary-foreground/95 truncate">{product.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">AVAILABLE AT 1 LOCATION</p>
            <p className="text-sm font-medium text-primary-foreground/80">{availableAt}</p>
        </CardContent>
    </Card>
)

export default function ProductLocatorPage() {
    return (
        <div className="min-h-screen bg-[#F3EADF] text-[#004B42]">
            {/* Header */}
            <header className="bg-[#EBDDCC] border-b border-[#004B42]/10">
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
                    <div className="container mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            <DispensaryCard name="Dutchess Cannabis" address="20513 Torrence Ave, Lynwood, IL 60411" phone="+1 708-668-7730" />
                            <DispensaryCard name="Lux Leaf Dispensary" address="5539 Miller Cir Dr, Matteson, IL 60443" phone="+1 708-905-4500" />
                            <DispensaryCard name="Mood Shine Cannabis" address="628 W Lincoln Hwy, Chicago Heights, IL" phone="+1 708-833-8474" />
                        </div>
                    </div>
                </div>

                {/* Filters & Products */}
                <div className="container mx-auto p-4 md:p-8">
                   <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Filters Sidebar */}
                        <aside className="lg:col-span-1 space-y-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input placeholder="Search dispensaries, products..." className="pl-10 h-12 rounded-full shadow-sm bg-white" />
                            </div>

                            <Card className="bg-white/80">
                                <CardContent className="p-4 space-y-4">
                                     <div className="space-y-2">
                                        <Label className="text-sm font-semibold flex items-center gap-2"><Building className="h-4 w-4" /> All Retailers</Label>
                                        <Select>
                                            <SelectTrigger><SelectValue placeholder="Select a retailer" /></SelectTrigger>
                                            <SelectContent><SelectItem value="any">Any</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> All Categories</Label>
                                        <Select>
                                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                                            <SelectContent><SelectItem value="any">Any</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> All Subcategories</Label>
                                        <Select disabled>
                                            <SelectTrigger><SelectValue placeholder="Select a subcategory" /></SelectTrigger>
                                        </Select>
                                    </div>
                                     <div className="space-y-2">
                                        <Label className="text-sm font-semibold flex items-center gap-2"><Tag className="h-4 w-4" /> All Tags</Label>
                                        <Select disabled>
                                            <SelectTrigger><SelectValue placeholder="Select a tag" /></SelectTrigger>
                                        </Select>
                                    </div>
                                     <div className="space-y-2">
                                        <Label className="text-sm font-semibold flex items-center gap-2"><Scale className="h-4 w-4" /> All Weights</Label>
                                        <Select>
                                            <SelectTrigger><SelectValue placeholder="Select a weight" /></SelectTrigger>
                                            <SelectContent><SelectItem value="any">Any</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                             <div className="text-center">
                                <Button variant="link" asChild className="text-[#004B42]">
                                    <Link href="/leave-a-review">
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        Have Feedback? Leave a Review
                                    </Link>
                                </Button>
                            </div>
                        </aside>

                        {/* Products Grid */}
                        <div className="lg:col-span-3">
                             <div className="mb-4 text-sm text-muted-foreground">
                                1 - {products.length} of {products.length} results
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                <ProductCard product={products[3]} availableAt="Dutchess Cannabis" savePercent={25} />
                                <ProductCard product={products[4]} availableAt="Dutchess Cannabis" savePercent={25} />
                                <ProductCard product={products[5]} availableAt="Lux Leaf Dispensary" savePercent={30} />
                                <ProductCard product={products[6]} availableAt="Lux Leaf Dispensary" savePercent={30} />
                                <ProductCard product={products[0]} availableAt="Mood Shine Cannabis" savePercent={20} />
                                <ProductCard product={products[1]} availableAt="Mood Shine Cannabis" savePercent={20} />
                            </div>
                        </div>
                   </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#F3EADF] py-8 px-4 mt-8">
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
    
