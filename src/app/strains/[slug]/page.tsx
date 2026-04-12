import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Leaf, FlaskConical, Star, ArrowLeft, Droplets, Brain, ShieldCheck, Sprout } from 'lucide-react';
import {
  fetchStrainBySlug,
  getTopEffects,
  getTopTerpenes,
  getTopConditions,
  buildStrainJsonLd,
} from '@/lib/strain-data';

export const revalidate = 86400; // 24h ISR

interface Props {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const strain = await fetchStrainBySlug(slug);
  if (!strain) return { title: 'Strain Not Found' };

  const title = `${strain.name} — ${strain.category || 'Cannabis'} Strain`;
  const thcStr = strain.thc_pct != null ? `THC: ${strain.thc_pct}%` : '';
  const cbdStr = strain.cbd_pct != null && strain.cbd_pct > 0 ? `, CBD: ${strain.cbd_pct}%` : '';
  const effectStr = strain.top_effect ? `. Top effect: ${strain.top_effect}` : '';
  const description = `${strain.name} is a ${strain.category || 'cannabis'} strain. ${thcStr}${cbdStr}${effectStr}. Full terpene profile, effects, and grow info.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'BakedBot',
      url: `https://bakedbot.ai/strains/${strain.slug}`,
    },
    alternates: {
      canonical: `https://bakedbot.ai/strains/${strain.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-700',
  sativa: 'bg-amber-100 text-amber-700',
  hybrid: 'bg-green-100 text-green-700',
};

export default async function StrainDetailPage({ params }: Props) {
  const { slug } = await params;
  const strain = await fetchStrainBySlug(slug);
  if (!strain) notFound();

  const effects = getTopEffects(strain);
  const terpenes = getTopTerpenes(strain);
  const conditions = getTopConditions(strain);
  const jsonLd = buildStrainJsonLd(strain);
  const flavors = strain.flavors?.split(',').map(f => f.trim()).filter(Boolean) || [];
  const negatives: Array<{ name: string; score: number }> = [];
  if (strain.negative_dry_mouth && strain.negative_dry_mouth > 0) negatives.push({ name: 'Dry Mouth', score: strain.negative_dry_mouth });
  if (strain.negative_dry_eyes && strain.negative_dry_eyes > 0) negatives.push({ name: 'Dry Eyes', score: strain.negative_dry_eyes });
  if (strain.negative_paranoid && strain.negative_paranoid > 0) negatives.push({ name: 'Paranoid', score: strain.negative_paranoid });

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
            href="/strains"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Strains
          </Link>

          {/* Header */}
          <header className="mb-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Leaf className="w-7 h-7 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {strain.name}
                  </h1>
                  {strain.category && (
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${CATEGORY_COLORS[strain.category] || 'bg-slate-100 text-slate-600'}`}>
                      {strain.category}
                    </span>
                  )}
                </div>
                {strain.parent_strains && (
                  <p className="text-sm text-slate-400 mt-1">
                    Genetics: {strain.parent_strains}
                  </p>
                )}
              </div>
              {strain.average_rating != null && (
                <div className="flex items-center gap-1 text-sm text-slate-500 flex-shrink-0">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-slate-800">{strain.average_rating.toFixed(1)}</span>
                  {strain.review_count ? <span>({strain.review_count.toLocaleString()})</span> : null}
                </div>
              )}
            </div>
            {strain.description && (
              <p className="text-slate-600 leading-relaxed">{strain.description}</p>
            )}
          </header>

          {/* Cannabinoid Profile */}
          <Section title="Cannabinoid Profile" icon={<FlaskConical className="w-5 h-5 text-green-600" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <CannabinoidCard label="THC" value={strain.thc_pct} color="green" />
              <CannabinoidCard label="CBD" value={strain.cbd_pct} color="blue" />
              <CannabinoidCard label="CBG" value={strain.cbg_pct} color="violet" />
              <CannabinoidCard label="THCV" value={strain.thcv_pct} color="orange" />
            </div>
          </Section>

          {/* Effects */}
          {effects.length > 0 && (
            <Section title="Effects" icon={<Brain className="w-5 h-5 text-indigo-500" />}>
              <div className="space-y-3">
                {effects.map((e) => (
                  <BarRow key={e.name} label={e.name} score={e.score} color="bg-indigo-500" />
                ))}
              </div>
              {negatives.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">Possible negatives</h4>
                  <div className="space-y-2">
                    {negatives.sort((a, b) => b.score - a.score).map((n) => (
                      <BarRow key={n.name} label={n.name} score={n.score} color="bg-red-400" />
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Terpenes */}
          {terpenes.length > 0 && (
            <Section title="Terpene Profile" icon={<Droplets className="w-5 h-5 text-teal-500" />}>
              <div className="space-y-3">
                {terpenes.map((t) => (
                  <BarRow key={t.name} label={t.name} score={t.score} color="bg-teal-500" />
                ))}
              </div>
            </Section>
          )}

          {/* Medical */}
          {conditions.length > 0 && (
            <Section title="Reported Medical Uses" icon={<ShieldCheck className="w-5 h-5 text-rose-500" />}>
              <div className="space-y-3">
                {conditions.map((c) => (
                  <BarRow key={c.name} label={c.name} score={c.score} color="bg-rose-400" />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Based on community-reported data. Not medical advice. Consult a healthcare professional.
              </p>
            </Section>
          )}

          {/* Flavors */}
          {flavors.length > 0 && (
            <Section title="Flavors" icon={<Leaf className="w-5 h-5 text-amber-500" />}>
              <div className="flex flex-wrap gap-2">
                {flavors.map((f) => (
                  <span
                    key={f}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Grow Info */}
          {(strain.grow_difficulty || strain.flowering_days) && (
            <Section title="Growing Info" icon={<Sprout className="w-5 h-5 text-lime-600" />}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {strain.grow_difficulty && (
                  <InfoCard label="Difficulty" value={strain.grow_difficulty} />
                )}
                {strain.flowering_days && (
                  <InfoCard label="Flowering" value={`${strain.flowering_days} days`} />
                )}
                {strain.yield_indoor && (
                  <InfoCard label="Indoor Yield" value={strain.yield_indoor} />
                )}
                {strain.yield_outdoor && (
                  <InfoCard label="Outdoor Yield" value={strain.yield_outdoor} />
                )}
                {strain.environment && (
                  <InfoCard label="Environment" value={strain.environment} />
                )}
              </div>
            </Section>
          )}

          {/* CTA */}
          <div className="mt-12 bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Looking for {strain.name} near you?</h3>
            <p className="text-slate-600 mb-4">
              BakedBot helps you find real-time dispensary inventory with verified lab data.
            </p>
            <Link
              href="/get-started"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              Find Dispensaries
            </Link>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>Data sourced from {strain.source || 'Leafly'} and community contributions. Not medical advice.</p>
            <p className="mt-1">
              <Link href="/strains" className="text-green-600 hover:underline">Browse all strains</Link>
              {' · '}
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

function CannabinoidCard({ label, value, color }: { label: string; value: number | null; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600 bg-green-50 border-green-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    violet: 'text-violet-600 bg-violet-50 border-violet-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
  };
  if (value == null) return null;
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color] || ''}`}>
      <div className="text-2xl font-black">{value}%</div>
      <div className="text-sm font-medium mt-1">{label}</div>
    </div>
  );
}

function BarRow({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="font-medium text-slate-700">{value}</div>
    </div>
  );
}
