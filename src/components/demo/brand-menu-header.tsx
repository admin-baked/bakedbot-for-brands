'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Menu,
  Search,
  ShoppingCart,
  MapPin,
  User,
  Leaf,
  CheckCircle,
  X,
  ArrowRight,
  Heart,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandMenuHeaderProps {
  brandName: string;
  brandLogo?: string;
  brandColors?: {
    primary: string;
    secondary?: string;
  };
  verified?: boolean;
  tagline?: string;
  cartItemCount?: number;
  selectedDispensary?: {
    name: string;
    city: string;
    state: string;
  } | null;
  onSearch?: (query: string) => void;
  onCartClick?: () => void;
  onLocationClick?: () => void;
}

const navLinks = [
  { label: 'Products', href: '#products' },
  { label: 'About', href: '#about' },
  { label: 'Find Near Me', href: '#locations', highlight: true },
];

export function BrandMenuHeader({
  brandName,
  brandLogo,
  brandColors = { primary: '#16a34a', secondary: '#064e3b' },
  verified = true,
  tagline,
  cartItemCount = 0,
  selectedDispensary,
  onSearch,
  onCartClick,
  onLocationClick,
}: BrandMenuHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b shadow-sm">
      {/* Top Bar - Brand Promise */}
      <div
        className="text-white text-sm py-2"
        style={{ backgroundColor: brandColors.secondary || brandColors.primary }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-6 text-white/90">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Lab Tested Products
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Order Online, Pickup at Dispensary
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              500+ Retail Partners
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="h-16 md:h-20 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu & Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {brandLogo ? (
                      <div className="relative h-8 w-8">
                        <Image
                          src={brandLogo}
                          alt={brandName}
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: brandColors.primary }}
                      >
                        <Leaf className="h-5 w-5 text-white" />
                      </div>
                    )}
                    {brandName}
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col gap-2 mt-6">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </form>

                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={cn(
                        'flex items-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors',
                        link.highlight
                          ? 'text-white'
                          : 'hover:bg-muted'
                      )}
                      style={link.highlight ? { backgroundColor: brandColors.primary } : {}}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.highlight && <MapPin className="h-4 w-4" />}
                      {link.label}
                      {link.highlight && <ArrowRight className="h-4 w-4 ml-auto" />}
                    </Link>
                  ))}

                  <div className="border-t my-4" />

                  {/* Selected Location */}
                  {selectedDispensary ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Pickup Location</p>
                      <p className="font-medium">{selectedDispensary.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedDispensary.city}, {selectedDispensary.state}
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-1"
                        style={{ color: brandColors.primary }}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLocationClick?.();
                        }}
                      >
                        Change location
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      style={{ backgroundColor: brandColors.primary }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLocationClick?.();
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                      Find Pickup Location
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="#" className="flex items-center gap-3">
              {brandLogo ? (
                <div className="relative h-10 w-10 md:h-12 md:w-12">
                  <Image
                    src={brandLogo}
                    alt={brandName}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: brandColors.primary }}
                >
                  <Leaf className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg md:text-xl tracking-tight">
                    {brandName}
                  </span>
                  {verified && (
                    <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-50" />
                  )}
                </div>
                {tagline && (
                  <span className="text-xs text-muted-foreground">
                    {tagline}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Center: Search (Desktop) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-lg mx-8"
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search ${brandName} products...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 h-11 bg-muted border-0 rounded-full focus-visible:ring-1"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full px-4"
                style={{ backgroundColor: brandColors.primary }}
              >
                Search
              </Button>
            </div>
          </form>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 mr-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-full transition-colors',
                    link.highlight
                      ? 'text-white'
                      : 'hover:bg-muted'
                  )}
                  style={link.highlight ? { backgroundColor: brandColors.primary } : {}}
                >
                  {link.highlight && <MapPin className="h-4 w-4 inline mr-1" />}
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Location Indicator (Desktop) */}
            {selectedDispensary && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={onLocationClick}
              >
                <MapPin className="h-4 w-4" style={{ color: brandColors.primary }} />
                <span className="max-w-[120px] truncate">
                  {selectedDispensary.name}
                </span>
              </Button>
            )}

            {/* Favorites */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Heart className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={onCartClick}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs text-white border-2 border-background"
                  style={{ backgroundColor: brandColors.primary }}
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {/* User Account */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/customer-login">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
