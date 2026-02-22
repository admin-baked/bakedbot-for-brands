'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  ShoppingCart,
  User,
  MapPin,
  Menu,
  ChevronDown,
  Leaf,
  Sparkles,
  Percent,
  Gift,
  Building2,
  Briefcase,
  Heart,
  Rocket,
  Phone,
} from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import { DealsTicker } from './deals-ticker';

interface DemoHeaderProps {
  brandName?: string;
  brandLogo?: string;
  brandSlug?: string; // Brand slug for customer login/signup redirect
  brandColors?: {
    primary: string;
    secondary: string;
  };
  useLogoInHeader?: boolean;
  location?: string;
  phone?: string; // Business phone number (e.g., "(315) 207-7935")
  onSearch?: (query: string) => void;
  onCategorySelect?: (category: string) => void;
  onCartClick?: () => void;
  onAccountClick?: () => void;
}

const navItems = [
  { label: 'SHOP', href: '#products', icon: Leaf },
  { label: 'CLEARANCE', href: '#clearance', icon: Percent, badge: 'SALE' },
  { label: 'CATEGORIES', href: '#categories', icon: ChevronDown, hasDropdown: true },
  { label: 'BRANDS', href: '#brands', icon: Sparkles },
  { label: 'DEALS', href: '#deals', icon: Gift, badge: 'HOT' },
];

const secondaryNavItems = [
  { label: 'Rewards', href: '#rewards', icon: Heart },
  { label: 'About', href: '#about', icon: Building2 },
  { label: 'Locations', href: '#locations', icon: MapPin },
  { label: 'Careers', href: '#careers', icon: Briefcase },
];

const categories = [
  { name: 'Flower', description: 'Premium cannabis buds', href: '#flower' },
  { name: 'Pre-Rolls', description: 'Ready to smoke joints', href: '#prerolls' },
  { name: 'Vapes', description: 'Cartridges & disposables', href: '#vapes' },
  { name: 'Edibles', description: 'Gummies, chocolates & more', href: '#edibles' },
  { name: 'Concentrates', description: 'Dabs, wax & shatter', href: '#concentrates' },
  { name: 'Tinctures', description: 'Oils & drops', href: '#tinctures' },
  { name: 'Topicals', description: 'Creams & balms', href: '#topicals' },
  { name: 'Accessories', description: 'Grinders, papers & more', href: '#accessories' },
];

export function DemoHeader({
  brandName = 'BakedBot Demo',
  brandLogo,
  brandSlug,
  brandColors,
  useLogoInHeader,
  location = 'San Francisco, CA',
  phone,
  onSearch,
  onCategorySelect,
  onCartClick,
  onAccountClick,
}: DemoHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartItems } = useStore();

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const primaryColor = brandColors?.primary || '#16a34a';

  // Customer login URL - redirects back to brand menu after login
  const customerLoginUrl = brandSlug
    ? `/customer-login?redirect=/${brandSlug}`
    : '/customer-login';

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow-sm">
      {/* Deals Ticker */}
      <DealsTicker backgroundColor={primaryColor} />

      {/* Main Header */}
      <div className="border-b" style={{ borderColor: `${primaryColor}20` }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    {!useLogoInHeader && brandName}
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-1">
                  {/* Call Button (Mobile) */}
                  {phone && (
                    <a href={`tel:${phone}`}>
                      <Button className="w-full mb-4 gap-2" style={{ backgroundColor: primaryColor }} variant="default">
                        <Phone className="h-4 w-4" />
                        Call {phone}
                      </Button>
                    </a>
                  )}

                  {/* Get Started CTA in mobile menu */}
                  <Link href={customerLoginUrl} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full mb-4 gap-2" style={{ backgroundColor: primaryColor }} variant="outline">
                      <Rocket className="h-4 w-4" />
                      Shop Now
                    </Button>
                  </Link>

                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="h-5 w-5" style={{ color: primaryColor }} />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                  <div className="border-t my-4" />
                  {secondaryNavItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/demo-shop" className="flex items-center gap-2">
              {brandLogo ? (
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Leaf className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-xl hidden sm:block">
                    {!useLogoInHeader && brandName}
                  </span>
                </div>
              )}
            </Link>

            {/* Location & Phone (Desktop) */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
                <span className="text-muted-foreground">Location:</span>
                <Button variant="link" className="p-0 h-auto font-medium" style={{ color: primaryColor }}>
                  {location}
                </Button>
              </div>

              {/* Phone Call Button */}
              {phone && (
                <div className="flex items-center gap-1 border-l pl-4">
                  <a href={`tel:${phone}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Phone className="h-4 w-4" />
                      {phone}
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Search Bar (Desktop) */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 w-full"
                />
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Shop Now Button (Desktop) */}
              <Link href={customerLoginUrl} className="hidden lg:block">
                <Button
                  size="sm"
                  className="gap-2 font-semibold"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Rocket className="h-4 w-4" />
                  Shop Now
                </Button>
              </Link>

              {/* Search (Mobile) */}
              <Button variant="ghost" size="icon" className="md:hidden">
                <Search className="h-5 w-5" />
              </Button>

              {/* User */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onAccountClick}
                asChild={!onAccountClick}
              >
                {onAccountClick ? (
                  <span><User className="h-5 w-5" /></span>
                ) : (
                  <Link href="/signin">
                    <User className="h-5 w-5" />
                  </Link>
                )}
              </Button>

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={onCartClick}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar (Desktop) */}
      <nav className="hidden md:block border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Primary Nav */}
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {navItems.map((item) => (
                  <NavigationMenuItem key={item.label}>
                    {item.hasDropdown ? (
                      <>
                        <NavigationMenuTrigger className="h-12 px-4 font-semibold text-sm">
                          {item.label}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="grid w-[400px] gap-2 p-4 md:w-[500px] md:grid-cols-2">
                            {categories.map((category) => (
                              <li key={category.name}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    href={category.href}
                                    className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                    onClick={() => onCategorySelect?.(category.name)}
                                  >
                                    <div className="text-sm font-medium leading-none">{category.name}</div>
                                    <p className="line-clamp-1 text-sm leading-snug text-muted-foreground mt-1">
                                      {category.description}
                                    </p>
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </>
                    ) : (
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href}
                          className="h-12 px-4 font-semibold text-sm inline-flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          {item.label}
                          {item.badge && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </NavigationMenuLink>
                    )}
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Secondary Nav */}
            <div className="flex items-center gap-6">
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
