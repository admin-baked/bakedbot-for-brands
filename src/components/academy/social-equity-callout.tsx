'use client';

/**
 * Social Equity Callout
 *
 * Highlights BakedBot's commitment to social equity and offers free Academy access
 * to social equity operators.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function SocialEquityCallout() {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <CardContent className="p-8">
        <div className="flex items-start gap-6">
          {/* Icon */}
          <div className="hidden md:flex w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center flex-shrink-0">
            <Heart className="h-8 w-8 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100">
                Social Equity Program
              </Badge>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Free Academy Access for Social Equity Operators
            </h2>

            <p className="text-muted-foreground mb-4 text-lg">
              We're committed to supporting cannabis entrepreneurs from communities
              disproportionately impacted by the War on Drugs. If you're a certified
              social equity applicant or licensee, you qualify for{' '}
              <span className="font-semibold text-foreground">
                free unlimited access
              </span>{' '}
              to the entire Cannabis Marketing AI Academy, plus exclusive resources.
            </p>

            {/* Benefits List */}
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <span className="text-sm">Full curriculum access (12 episodes)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <span className="text-sm">All downloadable resources</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <span className="text-sm">Priority support from our team</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <span className="text-sm">Exclusive social equity workshops</span>
              </div>
            </div>

            {/* Partner Logos/Links */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">
                In partnership with:
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <Link
                  href="https://www.mcbaonline.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  MCBA <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link
                  href="https://www.m4mm.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  M4MM <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link
                  href="https://www.bipocann.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  BIPOCANN <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
                asChild
              >
                <Link href="mailto:equity@bakedbot.ai?subject=Social Equity Academy Access">
                  <Users className="h-5 w-5" />
                  Apply for Free Access
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/dashboard">
                  Learn More About Our Mission
                </Link>
              </Button>
            </div>

            {/* Fine Print */}
            <p className="text-xs text-muted-foreground mt-4">
              Valid social equity certification or license required. Subject to
              verification. Contact us at equity@bakedbot.ai for details.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
