import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Droplets,
  ArrowLeft,
  Wind,
  Brain,
  ShieldCheck,
  Thermometer,
  Leaf,
  FlaskConical,
  Cherry,
} from 'lucide-react';
import { getTerpeneBySlug, getAllTerpeneSlugs, type TerpeneInfo } from '@/lib/terpene-data';

export const revalidate = 86400; // 24h ISR

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return getAllTerpeneSlugs().map((slug) => ({ slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const terpene = getTerpeneBySlug(slug);
  if (!terpene) return { title: 'Terpene Not Found' };

  const title = `${terpene.name} Terpene — Aroma, Effects & Strains`;
  const description = `${terpene.name} (${terpene.formula}) — ${terpene.aroma}. Effects: ${terpene.effects.join(', ')}. Found in ${terpene.strainExamples.slice(0, 3).join(', ')} and more. Full terpene profile by BakedBot.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'BakedBot',
      url: `https://bakedbot.ai/terpenes/${terpene.slug}`,
    },
    alternates: {
      canonical: `https://bakedbot.ai/terpenes/${terpene.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Color map (matches index page)
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
// JSON-LD
// ---------------------------------------------------------------------------

function buildJsonLd(t: TerpeneInfo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ChemicalSubstance',
    name: t.name,
    alternateName: t.slug,
    molecularFormula: t.formula,
    description: t.description,
    url: `https://bakedbot.ai/terpenes/${t.slug}`,
    hasBioChemEntityPart: t.alsoFoundIn.map((source) => ({
      '@type': 'ChemicalSubstance',
      name: source,
    })),
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TerpeneDetailPage({ params }: Props) {
  const { slug } = await params;
  const terpene = getTerpeneBySlug(slug);
  if (!terpene) notFound();

  const c = getColor(terpene.color);
  const jsonLd = buildJsonLd(terpene);

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-10">

          {/* Back nav */}
          <Link
            href="/terpenes"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Terpenes
          </Link>

          {/* Header */}
          <header className="mb-10">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-14 h-14 ${c.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                <Droplets className={`w-7 h-7 ${c.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {terpene.name}
                  </h1>
                  <span className={`text-sm font-mono font-semibold px-3 py-1 rounded-full ${c.bg} ${c.text} ${c.border} border`}>
                    {terpene.formula}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed">{terpene.description}</p>
          </header>

          {/* Quick Facts */}
          <section className="mb-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <QuickFact
                icon={<Wind className={`w-5 h-5 ${c.icon}`} />}
                label="Aroma"
                value={terpene.aroma}
              />
              <QuickFact
                icon={<Thermometer className={`w-5 h-5 ${c.icon}`} />}
                label="Boiling Point"
                value={terpene.boilingPoint}
              />
              <QuickFact
                icon={<FlaskConical className={`w-5 h-5 ${c.icon}`} />}
                label="Formula"
                value={terpene.formula}
              />
            </div>
          </section>

          {/* Effects */}
          <Section title="Effects" icon={<Brain className="w-5 h-5 text-indigo-500" />}>
            <div className="flex flex-wrap gap-2">
              {terpene.effects.map((effect) => (
                <span
                  key={effect}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${c.bg} ${c.text} ${c.border}`}
                >
                  {effect}
                </span>
              ))}
            </div>
          </Section>

          {/* Medical Uses */}
          <Section title="Reported Medical Uses" icon={<ShieldCheck className="w-5 h-5 text-rose-500" />}>
            <div className="flex flex-wrap gap-2">
              {terpene.medicalUses.map((use) => (
                <span
                  key={use}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-sm font-medium"
                >
                  {use}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Based on published research and community-reported data. Not medical advice. Consult a healthcare professional.
            </p>
          </Section>

          {/* Common Strains */}
          <Section title="Common Strains" icon={<Leaf className="w-5 h-5 text-green-600" />}>
            <div className="flex flex-wrap gap-2">
              {terpene.strainExamples.map((strain) => (
                <Link
                  key={strain}
                  href={`/strains?q=${encodeURIComponent(strain)}`}
                  className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  {strain}
                </Link>
              ))}
            </div>
          </Section>

          {/* Also Found In */}
          <Section title="Also Found In" icon={<Cherry className="w-5 h-5 text-amber-500" />}>
            <div className="flex flex-wrap gap-2">
              {terpene.alsoFoundIn.map((source) => (
                <span
                  key={source}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium"
                >
                  {source}
                </span>
              ))}
            </div>
          </Section>

          {/* CTA */}
          <div className="mt-12 bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Find {terpene.name}-Rich Strains
            </h3>
            <p className="text-slate-600 mb-4">
              Explore strains with high {terpene.name} content and discover your perfect match.
            </p>
            <Link
              href={`/strains?terpene=${encodeURIComponent(terpene.name.toLowerCase())}`}
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              Browse {terpene.name} Strains
            </Link>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>Terpene data sourced from peer-reviewed research and community contributions. Not medical advice.</p>
            <p className="mt-1">
              <Link href="/terpenes" className="text-green-600 hover:underline">All terpenes</Link>
              {' \u00B7 '}
              <Link href="/strains" className="text-green-600 hover:underline">Browse strains</Link>
              {' \u00B7 '}
              <Link href="/" className="text-green-600 hover:underline">BakedBot AI</Link>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function QuickFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className="font-semibold text-slate-700 text-sm">{value}</div>
    </div>
  );
}
