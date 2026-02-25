/**
 * Staff Guide — Printable budtender reference cards
 *
 * Accessible at /dashboard/menu/staff-guide
 * Print: browser File > Print (or Cmd/Ctrl+P)
 *        Recommended: A4/Letter, Portrait, All pages, Background graphics ON
 */

import { getBudtenderGuideData, type BudtenderProduct } from '@/server/actions/budtender-guide';
import { PrintButton } from './print-button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  flower: '🌿',
  'pre-roll': '📜',
  preroll: '📜',
  vape: '💨',
  vapes: '💨',
  cartridge: '💨',
  concentrate: '🔬',
  concentrates: '🔬',
  extract: '🔬',
  edible: '🍬',
  edibles: '🍬',
  tincture: '💧',
  tinctures: '💧',
  topical: '🧴',
  topicals: '🧴',
  accessory: '🛠️',
  accessories: '🛠️',
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] ?? '📦';
}

const STRAIN_COLORS: Record<string, string> = {
  Sativa: 'bg-amber-100 text-amber-800 border-amber-200',
  Indica: 'bg-violet-100 text-violet-800 border-violet-200',
  Hybrid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CBD: 'bg-sky-100 text-sky-800 border-sky-200',
};

function formatWeight(weight?: number, unit?: string): string {
  if (!weight) return '';
  const u = unit ?? 'g';
  return `${weight}${u}`;
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: BudtenderProduct }) {
  const strainColor = product.strainType ? STRAIN_COLORS[product.strainType] : '';
  const weightStr = formatWeight(product.weight, product.weightUnit);

  return (
    <div
      className={[
        'rounded-lg border bg-white p-3 flex gap-3 text-sm',
        'break-inside-avoid',
        !product.inStock ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Image */}
      <div className="w-16 h-16 flex-shrink-0 rounded-md bg-muted overflow-hidden relative">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="64px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {getCategoryIcon(product.category)}
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white uppercase tracking-wide">Out</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name + brand */}
        <div className="font-semibold leading-tight line-clamp-1 text-[13px]">
          {product.name}
        </div>
        {product.brandName && (
          <div className="text-[11px] text-muted-foreground leading-tight mb-1">
            {product.brandName}
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          {product.strainType && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border leading-none ${strainColor}`}>
              {product.strainType}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border leading-none">
            {product.category}
          </span>
          {weightStr && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border leading-none">
              {weightStr}
            </span>
          )}
        </div>

        {/* Potency + price row */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">
            {product.thcPercent != null && (
              <span className="text-green-700 font-semibold">{product.thcPercent.toFixed(1)}% THC</span>
            )}
            {product.thcPercent != null && product.cbdPercent != null && (
              <span className="mx-1 text-muted-foreground">·</span>
            )}
            {product.cbdPercent != null && (
              <span>{product.cbdPercent.toFixed(1)}% CBD</span>
            )}
            {product.thcPercent == null && product.cbdPercent == null && (
              <span className="text-muted-foreground/60">Potency N/A</span>
            )}
          </div>
          <div className="font-bold text-[13px] tabular-nums flex-shrink-0">
            ${product.price.toFixed(2)}
          </div>
        </div>

        {/* Effects */}
        {product.effects && product.effects.length > 0 && (
          <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
            {product.effects.slice(0, 4).join(' · ')}
          </div>
        )}

        {/* Description — optional, 1 line */}
        {product.description && (
          <div className="mt-1 text-[10px] text-muted-foreground leading-tight line-clamp-1">
            {product.description}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  products,
  isFirst,
}: {
  category: string;
  products: BudtenderProduct[];
  isFirst: boolean;
}) {
  const icon = getCategoryIcon(category);
  const inStock = products.filter(p => p.inStock).length;

  return (
    <section className={isFirst ? '' : 'break-before-page'}>
      {/* Category header */}
      <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-foreground/10">
        <span className="text-2xl">{icon}</span>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{category}</h2>
          <p className="text-xs text-muted-foreground">
            {inStock} in stock · {products.length} total
          </p>
        </div>
      </div>

      {/* Card grid — 2 columns on screen, 2 on print */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffGuidePage() {
  let data;
  try {
    data = await getBudtenderGuideData();
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p className="text-lg font-medium">Could not load product catalog</p>
        <p className="text-sm">Sync your POS to generate the staff guide.</p>
        <Link href="/dashboard/menu" className="mt-4 text-sm underline">
          Back to Menu
        </Link>
      </div>
    );
  }

  const { orgName, generatedAt, totalProducts, inStockCount, productsByCategory, categories } = data;

  return (
    <>
      {/* Print styles — injected at root level */}
      <style>{`
        @media print {
          /* Hide dashboard chrome */
          nav, aside, header, [data-sidebar], .no-print { display: none !important; }
          /* Reset page margins */
          @page { margin: 0.6in 0.5in; }
          body { font-size: 11px; }
          /* Card grid stays 2-col on print */
          .grid { grid-template-columns: 1fr 1fr; }
          /* Ensure images print */
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Ensure colors print */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-8 pb-16">

        {/* Screen-only nav bar */}
        <div className="no-print flex items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur border-b py-3 -mx-4 px-4 z-10">
          <Link
            href="/dashboard/menu"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
          <div className="text-sm text-muted-foreground">
            {inStockCount} in stock · {totalProducts} total SKUs
          </div>
          <PrintButton />
        </div>

        {/* Guide header — prints at top of page 1 */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{orgName} — Staff Product Guide</h1>
          <p className="text-sm text-muted-foreground">
            Generated {generatedAt} · {inStockCount} products in stock across {categories.length} categories
          </p>
          <p className="text-xs text-muted-foreground no-print">
            Tip: Use <kbd className="px-1 py-0.5 rounded border text-xs font-mono">Ctrl+P</kbd> (or <kbd className="px-1 py-0.5 rounded border text-xs font-mono">⌘P</kbd>) to print. Select &ldquo;Background graphics&rdquo; for colored strain badges.
          </p>
        </div>

        {/* Summary stats row */}
        <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.slice(0, 4).map(cat => {
            const prods = productsByCategory[cat] ?? [];
            const inS = prods.filter(p => p.inStock).length;
            return (
              <div key={cat} className="rounded-lg border bg-muted/30 px-4 py-3 text-center">
                <div className="text-xl">{getCategoryIcon(cat)}</div>
                <div className="font-semibold text-sm mt-1">{cat}</div>
                <div className="text-xs text-muted-foreground">{inS} in stock</div>
              </div>
            );
          })}
        </div>

        {/* Category sections */}
        <div className="space-y-12">
          {categories.map((cat, idx) => (
            <CategorySection
              key={cat}
              category={cat}
              products={productsByCategory[cat] ?? []}
              isFirst={idx === 0}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          Generated by BakedBot · {generatedAt} · For internal staff use only
        </div>

      </div>
    </>
  );
}
