'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Leaf,
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  ArrowRight,
  Shield,
  Award,
  Truck,
} from 'lucide-react';

interface DemoFooterProps {
  brandName?: string;
  brandLogo?: string;
  primaryColor?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    hours?: string;
  };
}

const shopLinks = [
  { label: 'All Products', href: '#products' },
  { label: 'Flower', href: '#flower' },
  { label: 'Pre-Rolls', href: '#prerolls' },
  { label: 'Vapes', href: '#vapes' },
  { label: 'Edibles', href: '#edibles' },
  { label: 'Concentrates', href: '#concentrates' },
  { label: 'Tinctures', href: '#tinctures' },
  { label: 'Topicals', href: '#topicals' },
];

const companyLinks = [
  { label: 'About Us', href: '#about' },
  { label: 'Careers', href: '#careers' },
  { label: 'Locations', href: '#locations' },
  { label: 'Contact', href: '#contact' },
  { label: 'Blog', href: '#blog' },
  { label: 'Press', href: '#press' },
];

const supportLinks = [
  { label: 'FAQ', href: '#faq' },
  { label: 'Shipping & Delivery', href: '#shipping' },
  { label: 'Returns', href: '#returns' },
  { label: 'Track Order', href: '#track' },
  { label: 'Rewards Program', href: '#rewards' },
  { label: 'Refer a Friend', href: '#refer' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '#privacy' },
  { label: 'Terms of Service', href: '#terms' },
  { label: 'Accessibility', href: '#accessibility' },
];

export function DemoFooter({
  brandName = 'BakedBot Demo',
  brandLogo,
  primaryColor = '#16a34a',
  location = {
    address: '420 Cannabis Ave',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    phone: '(555) 420-0420',
    email: 'hello@bakedbot.ai',
    hours: 'Mon-Sun: 9AM - 10PM',
  },
}: DemoFooterProps) {
  const secondaryColor = '#064e3b';

  return (
    <footer className="bg-[#1a1a2e] text-white">
      {/* Trust Badges */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <Shield className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <h4 className="font-semibold">Lab Tested</h4>
                <p className="text-sm text-white/60">All products are third-party tested</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <Truck className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <h4 className="font-semibold">Fast Delivery</h4>
                <p className="text-sm text-white/60">Same-day delivery available</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <Award className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <h4 className="font-semibold">Rewards Program</h4>
                <p className="text-sm text-white/60">Earn points on every purchase</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/shop/demo" className="flex items-center gap-2 mb-4">
              {brandLogo ? (
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={150}
                  height={50}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Leaf className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-xl">{brandName}</span>
                </div>
              )}
            </Link>
            <p className="text-white/60 text-sm mb-6 max-w-sm">
              Your premier destination for premium cannabis products. We&apos;re committed to quality,
              education, and exceptional customer experiences.
            </p>

            {/* Newsletter */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Subscribe for Deals</h4>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
                <Button style={{ backgroundColor: primaryColor }}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
              >
                <Instagram className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
              >
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              {location.address && (
                <li className="flex items-start gap-2 text-sm text-white/60">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: primaryColor }} />
                  <span>
                    {location.address}<br />
                    {location.city}, {location.state} {location.zip}
                  </span>
                </li>
              )}
              {location.phone && (
                <li className="flex items-center gap-2 text-sm text-white/60">
                  <Phone className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                  <span>{location.phone}</span>
                </li>
              )}
              {location.email && (
                <li className="flex items-center gap-2 text-sm text-white/60">
                  <Mail className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                  <span>{location.email}</span>
                </li>
              )}
              {location.hours && (
                <li className="flex items-center gap-2 text-sm text-white/60">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                  <span>{location.hours}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40 text-center md:text-left">
              © {new Date().getFullYear()} {brandName}. All rights reserved.
              Powered by{' '}
              <Link href="https://bakedbot.ai" className="underline hover:text-white">
                BakedBot AI
              </Link>
            </p>
            <div className="flex items-center gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Age Verification Notice */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/30 text-center">
              You must be 21 years of age or older to view this website. By accessing this site,
              you accept the Terms of Use and Privacy Policy. Cannabis products are for use only
              by persons 21 years of age or older. Keep out of the reach of children.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
