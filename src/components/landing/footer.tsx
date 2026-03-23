import Link from 'next/link';
import { APP_VERSION_DISPLAY } from '@/lib/version';

export function LandingFooter() {
  return (
    <footer className="border-t py-12 px-4 md:px-6 bg-muted/20">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
                <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground/60">Platform</h4>
                <ul className="space-y-2 text-sm">
                    <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                    <li><Link href="/demo" className="hover:text-primary transition-colors">Demo</Link></li>
                    <li><Link href="/get-started" className="hover:text-primary transition-colors">Get Started</Link></li>
                    <li><Link href="/claim" className="hover:text-primary transition-colors">Claim Listing</Link></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground/60">Case Studies</h4>
                <ul className="space-y-2 text-sm">
                    <li><Link href="/case-studies" className="hover:text-primary transition-colors">All Stories</Link></li>
                    <li><Link href="/case-studies/ultra-cannabis" className="hover:text-primary transition-colors">Ultra Cannabis</Link></li>
                    <li><Link href="/case-studies/zaza-factory" className="hover:text-primary transition-colors">Zaza Factory</Link></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground/60">Local Compliance</h4>
                <ul className="space-y-2 text-sm">
                    <li><Link href="/states/new-york" className="hover:text-primary transition-colors">New York</Link></li>
                    <li><Link href="/states/michigan" className="hover:text-primary transition-colors">Michigan</Link></li>
                    <li><Link href="/states/illinois" className="hover:text-primary transition-colors">Illinois</Link></li>
                    <li><Link href="/states/california" className="hover:text-primary transition-colors">California</Link></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground/60">Legal</h4>
                <ul className="space-y-2 text-sm">
                    <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                    <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                    <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                </ul>
            </div>
        </div>
        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} BakedBot AI <span className="opacity-40 ml-2">{APP_VERSION_DISPLAY}</span></span>
            <div className="flex gap-6">
                <Link href="/help" className="hover:underline">Documentation</Link>
                <Link href="/blog" className="hover:underline">Blog</Link>
            </div>
        </div>
      </div>
    </footer>
  );
}
