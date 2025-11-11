'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';

export function Footer() {
  return (
    <footer className="bg-muted/40 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground">
              Your AI-powered guide to cannabis.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-muted-foreground hover:text-primary">Home</Link></li>
              <li><Link href="/product-locator" className="text-muted-foreground hover:text-primary">Product Locator</Link></li>
              <li><Link href="/leave-a-review" className="text-muted-foreground hover:text-primary">Leave a Review</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">For Business</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/brand-login" className="text-muted-foreground hover:text-primary">Brand Login</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary">Terms of Service</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BakedBot AI. All Rights Reserved.</p>
          <p className="mt-1">For use only by adults 21 years of age and older. Keep out of reach of children.</p>
        </div>
      </div>
    </footer>
  );
}