import Link from 'next/link';
import { Droplets, ArrowRight, Leaf, FlaskConical } from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { TERPENES } from '@/lib/terpene-data';

export const revalidate = 86400; // 24h ISR — static reference content

// ---------------------------------------------------------------------------
// Color map — Tailwind classes keyed by the terpene `color` field
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; icon: string; pill: string }> = {
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   icon: 'text-green-600',   pill: 'bg-green-100 text-green-700' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: 'text-amber-600',   pill: 'bg-amber-100 text-amber-700' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-600', pill: 'bg-emerald-100 text-emerald-700' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: 'text-orange-600',  pill: 'bg-orange-100 text-orange-700' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: 'text-purple-600',  pill: 'bg-purple-100 text-purple-700' },
  lime:    { bg: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200',    icon: 'text-lime-600',    pill: 'bg-lime-100 text-lime-700' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     icon: 'text-sky-600',     pill: 'bg-sky-100 text-sky-700' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    icon: 'text-teal-600',    pill: 'bg-teal-100 text-teal-700' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: 'text-rose-600',    pill: 'bg-rose-100 text-rose-700' },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    icon: 'text-pink-600',    pill: 'bg-pink-100 text-pink-700' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    icon: 'text-cyan-600',    pill: 'bg-cyan-100 text-cyan-700' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  icon: 'text-indigo-600',  pill: 'bg-indigo-100 text-indigo-700' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: 'text-violet-600',  pill: 'bg-violet-100 text-violet-700' },
};

const fallbackColor = COLOR_MAP.green;

function getColor(key: string) {
  return COLOR_MAP[key] ?? fallbackColor;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TerpenesIndexPage() {
  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Hero */}
        <header className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Droplets className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
            Cannabis Terpene Encyclopedia
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover the 15 most common terpenes found in cannabis — their aromas, effects,
            medical benefits, and which strains are rich in each. Science-backed profiles
            powered by BakedBot AI.
          </p>
          <div className="mt-6 flex justify-center gap-3 text-sm flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full font-medium text-teal-700">
              <FlaskConical className="w-3.5 h-3.5" />
              15 Terpenes
            </span>
            <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full font-medium text-purple-700">
              <Leaf className="w-3.5 h-3.5" />
              50+ Strains Referenced
            </span>
          </div>
        </header>

        {/* Terpene Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TERPENES.map((t) => {
            const c = getColor(t.color);
            return (
              <Link
                key={t.slug}
                href={`/terpenes/${t.slug}`}
                className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-green-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Name + formula */}
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-green-600 transition-colors">
                    {t.name}
                  </h2>
                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                    {t.formula}
                  </span>
                </div>

                {/* Aroma */}
                <p className="text-sm text-slate-500 mb-3">
                  <span className="font-medium text-slate-600">Aroma:</span> {t.aroma}
                </p>

                {/* Effects pills */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {t.effects.map((effect) => (
                    <span key={effect} className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.pill}`}>
                      {effect}
                    </span>
                  ))}
                </div>

                {/* Strain examples */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {t.strainExamples.slice(0, 3).map((strain) => (
                    <span key={strain} className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full">
                      {strain}
                    </span>
                  ))}
                </div>

                {/* View link */}
                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 group-hover:gap-2 transition-all">
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Cross-link to strains */}
        <div className="mt-12 bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Explore Strains by Terpene
          </h3>
          <p className="text-slate-600 mb-4">
            Use terpene profiles to find strains that match the effects you want.
          </p>
          <Link
            href="/strains"
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            Browse Strains
          </Link>
        </div>

        {/* SEO Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-100 text-center text-sm text-slate-400">
          <p>
            Terpene data sourced from peer-reviewed research and community contributions.
            Not medical advice. Powered by{' '}
            <Link href="/" className="text-green-600 hover:underline">BakedBot AI</Link>.
          </p>
        </footer>
      </div>
    </div>
    <LandingFooter />
    </>
  );
}
