#!/usr/bin/env node
/**
 * seed-compliance-kb.mjs
 *
 * One-time bootstrap: seed the BakedBot Hive Mind with verified cannabis
 * compliance facts for the 9 primary US states we support.
 *
 * Run: node ./scripts/seed-compliance-kb.mjs
 *
 * Uses writeComplianceFact from src/server/tools/hive-mind.ts via dynamic
 * import so Next.js path aliases are resolved through tsconfig-paths.
 */

import { register } from 'tsconfig-paths';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Register TypeScript path aliases
register({
    baseUrl: path.join(root, 'src'),
    paths: {
        '@/*': ['./*'],
    },
});

// Dynamically import the compiled hive-mind module (requires ts-node or prior tsc build)
// In production, this runs against the compiled dist. During dev, use ts-node.
const { writeComplianceFact } = await import('../src/server/tools/hive-mind.js').catch(() =>
    import('../.next/server/chunks/hive-mind.js').catch(() => {
        console.error('ERROR: Could not import hive-mind.ts. Run "npm run build" first or use ts-node.');
        console.error('Usage: npx ts-node --project tsconfig.json scripts/seed-compliance-kb.mjs');
        process.exit(1);
    })
);

const SOURCE = 'seed-script-2026-04-18';

const facts = [
    // =========================================================================
    // NEW YORK (NY)
    // =========================================================================
    ['NY', 'possession-limits', 'NY adult recreational (21+): up to 3 oz (85g) flower and 24g concentrate in public. Home possession up to 5 lbs. Regulator: OCM (Office of Cannabis Management). Medical patients have higher limits under MCRSA.', SOURCE],
    ['NY', 'advertising', 'NY OCM advertising rules: No targeting audiences where 30%+ are under 21. All ads must include "For Adults 21+" and the NY cannabis symbol. Social media posts about deals count as advertising. Age-gating required on digital platforms. No billboards within 500 feet of schools, parks, or places of worship. No health/wellness claims.', SOURCE],
    ['NY', 'packaging', 'NY packaging requirements: Child-resistant packaging required. No imagery appealing to minors (cartoons, toys, candy imagery). Plain packaging preferred. Must display: licensee name, license number, net weight, THC/CBD content, required warnings ("For Adults 21+", "Keep Away From Children"), batch number, and harvest/manufacture date.', SOURCE],
    ['NY', 'delivery', 'NY cannabis delivery: Legal for licensed retailers. Requires delivery-specific license endorsement from OCM. Delivery driver must verify ID and age (21+) at handoff. No delivery to locations within 500 feet of a school. GPS tracking required for delivery vehicles.', SOURCE],
    ['NY', 'tax', 'NY cannabis tax: 9% state excise tax + local excise up to 4% (NYC adds 4%). Plus standard 8.875% NYC sales tax for NYC. State distributes a portion to municipalities and counties. Medical cannabis exempt from excise tax.', SOURCE],

    // =========================================================================
    // CALIFORNIA (CA)
    // =========================================================================
    ['CA', 'possession-limits', 'CA adult recreational (21+): up to 1 oz (28.5g) flower, 8g concentrate in public. Home cultivation: up to 6 plants. Regulator: DCC (Department of Cannabis Control).', SOURCE],
    ['CA', 'advertising', 'CA DCC advertising rules: Age-gate required on all digital platforms. No advertising on channels where >28.4% of audience is under 21. Billboard advertising prohibited within 1,000 feet of schools/daycares/playgrounds. No unsolicited direct mail. No health claims. All ads must include "For adults 21 and over only" and DCC license number.', SOURCE],
    ['CA', 'packaging', 'CA packaging: Child-resistant, re-sealable, opaque. Must include: CA universal cannabis symbol, DCC license number, "GOVERNMENT WARNING" statement, THC/CBD content, batch/lot number, weight, testing lab and date, ingredient list for edibles. No images/cartoons that appeal to minors.', SOURCE],
    ['CA', 'delivery', 'CA cannabis delivery: Legal for licensed retailers (Type 9 delivery license). Retailer must have physical location in CA. Order must be received digitally. No cash on delivery (cashless ATM or card only). No delivery from vehicles with obscured inventory storage.', SOURCE],
    ['CA', 'tax', 'CA cannabis tax: 15% state excise tax on retail price (as of Jan 2023, cultivator tax eliminated). Local taxes vary widely: Los Angeles 10%, San Francisco 5%, Sacramento 4%. Combined effective tax often 30–45%. Medical patients (MMIC holders) exempt from state sales tax.', SOURCE],

    // =========================================================================
    // COLORADO (CO)
    // =========================================================================
    ['CO', 'possession-limits', 'CO adult recreational (21+): up to 1 oz (28g) flower or equivalent. Concentrate equivalent: 8g. Home cultivation: up to 3 mature + 3 immature plants. Regulator: MED (Marijuana Enforcement Division).', SOURCE],
    ['CO', 'advertising', 'CO MED advertising: No mass market advertising where >30% audience is under 21. No billboards on interstate highways or within 1,000 feet of schools. No marketing to minors (no cartoons, mascots). All ads must include health warnings and license number. Radio/TV only on channels where 71.6%+ audience is 21+.', SOURCE],
    ['CO', 'packaging', 'CO packaging: Tamper-evident, child-resistant (CR certified). Must bear the CO universal symbol (exclamation mark in red diamond). Required labels: licensee name/number, net weight, THC/CBD %, "KEEP OUT OF REACH OF CHILDREN", batch number, test results. No bright colors or imagery appealing to minors.', SOURCE],
    ['CO', 'delivery', 'CO cannabis delivery: Legal with state-issued delivery endorsement. Requires GPS tracking, manifest system (METRC), and age verification at delivery. No delivery within 1,000 feet of a school. Driver must carry license copy and product manifest. Residential and business delivery allowed.', SOURCE],
    ['CO', 'tax', 'CO cannabis tax: 15% state retail excise tax + 2.9% state sales tax. Local city/county taxes add 0–5% depending on jurisdiction. Denver adds 5.5% local. Medical cannabis: 2.9% state sales tax only (no excise).', SOURCE],

    // =========================================================================
    // ILLINOIS (IL)
    // =========================================================================
    ['IL', 'possession-limits', 'IL adult recreational (21+): up to 1 oz (30g) flower, 5g concentrate, 500mg THC in infused products. Illinois residents may also possess up to 2.5 oz at home. Regulator: IDFPR / Illinois Cannabis Regulation and Tax Act (CRTA).', SOURCE],
    ['IL', 'advertising', 'IL advertising rules: No advertising within 1,000 feet of schools, playgrounds, or facilities primarily serving minors. No targeting persons under 21. Must include "For Adults 21 and Over" and license number. No health claims. Digital ads require age-gating.', SOURCE],
    ['IL', 'packaging', 'IL packaging: Opaque, child-resistant, tamper-evident. Must display: IDFPR license number, universal symbol, weight, THC/CBD content, "FOR USE BY ADULTS 21 AND OVER", batch number, manufacturer info, and health warnings. No images resembling products familiar to minors.', SOURCE],
    ['IL', 'delivery', 'IL cannabis delivery: As of 2023, delivery is legal for licensed dispensaries with a delivery endorsement. Must comply with local municipality opt-in rules — not all municipalities allow delivery. Age verification and photo ID required at handoff.', SOURCE],
    ['IL', 'tax', 'IL cannabis tax: State excise tax 10% (0–35% THC) or 25% (>35% THC flower) or 20% (infused products). Plus 6.25% state sales tax. Local municipalities may add up to 3%. Chicago adds 3%. Medical cannabis: 1% tax for qualifying patients.', SOURCE],

    // =========================================================================
    // MASSACHUSETTS (MA)
    // =========================================================================
    ['MA', 'possession-limits', 'MA adult recreational (21+): up to 1 oz (28.3g) in public, 10 oz at home. Up to 5g concentrate equivalent. Home cultivation: 6 plants per adult, max 12 per household. Regulator: CCC (Cannabis Control Commission).', SOURCE],
    ['MA', 'advertising', 'MA CCC advertising rules: No advertising on any media with >30% audience under 21. No advertising within 1,000 feet of schools, parks, or facilities primarily serving youth. Must include "Please Consume Responsibly", "Do Not Drive", "Keep Out Of Reach Of Children", and CCC license number. No health claims. No athlete endorsements.', SOURCE],
    ['MA', 'packaging', 'MA packaging: Child-resistant, tamper-evident, re-sealable. Opaque for single-use containers. Must include: licensee name/license number, CCC-required health warnings, net weight, THC/CBD %, batch ID, expiration/best-by date. No images appealing to minors.', SOURCE],
    ['MA', 'delivery', 'MA cannabis delivery: Legal for licensed retailers (requires delivery license endorsement from CCC). Cashless transactions only for delivery. Age verification and government-issued ID required at delivery. Must use state-approved seed-to-sale tracking (METRC). GPS tracking mandatory.', SOURCE],
    ['MA', 'tax', 'MA cannabis tax: 10.75% state excise tax + 6.25% state sales tax = 17% total base. Municipalities may add up to 3% local excise tax. Medical cannabis: sales tax only (6.25%), no excise, and sales tax waived for registered MMJ patients.', SOURCE],

    // =========================================================================
    // WASHINGTON (WA)
    // =========================================================================
    ['WA', 'possession-limits', 'WA adult recreational (21+): up to 1 oz (28.3g) usable marijuana, 7g concentrate, 16 oz solid infused product, 72 oz liquid infused product. No home cultivation for recreational users. Regulator: LCB (Liquor and Cannabis Board).', SOURCE],
    ['WA', 'advertising', 'WA LCB advertising rules: No advertising on channels or media primarily targeted to under-21 audience. No placement within 1,000 feet of schools, playgrounds, recreation centers, or public libraries. Must include LCB license number. No health claims. Social media requires age-gating. No product samples in advertising.', SOURCE],
    ['WA', 'packaging', 'WA packaging: Exit packaging must be child-resistant or sold in child-resistant packaging. Must display: UBI number, pesticide disclosure, THC/CBD per serving and per package, number of servings, net weight, batch number, required warnings. Opaque exit bags required.', SOURCE],
    ['WA', 'delivery', 'WA cannabis delivery: Legal as of 2020 for licensed retailers. Requires LCB delivery endorsement. Must use LEAF Data Systems seed-to-sale. Age and ID verification at delivery. Only adult consumers may receive delivery — no delivery to businesses. No delivery within 1,000 feet of schools.', SOURCE],
    ['WA', 'tax', 'WA cannabis tax: 37% state excise tax on retail price (highest in nation). No separate state sales tax on cannabis — excise replaces it. No additional local cannabis tax (pre-empted by state). Medical cannabis: 37% excise applies but qualifying patients have a 6% sales tax exemption via recognition card.', SOURCE],

    // =========================================================================
    // NEVADA (NV)
    // =========================================================================
    ['NV', 'possession-limits', 'NV adult recreational (21+): up to 1 oz (28.3g) flower, 3.5g concentrate in public. Home cultivation: up to 6 plants per adult (max 12 per household) if no dispensary within 25 miles. Regulator: CCB (Cannabis Compliance Board).', SOURCE],
    ['NV', 'advertising', 'NV CCB advertising rules: No advertising on media with >30% under-21 audience. No advertising within 1,000 feet of schools, playgrounds, or youth activity facilities. Must include "For Adults 21 and Over", "Keep Away From Children", and NV license number. No health claims. No celebrity or athlete endorsements that target minors.', SOURCE],
    ['NV', 'packaging', 'NV packaging: Child-resistant, tamper-evident, opaque. Required: CCB-issued license number, universal symbol, net weight, THC/CBD %, batch number, expiration date, "CONTAINS MARIJUANA — KEEP OUT OF REACH OF CHILDREN". No cartoons or bright colors appealing to minors.', SOURCE],
    ['NV', 'delivery', 'NV cannabis delivery: Legal for licensed retailers with delivery endorsement from CCB. Must verify 21+ and valid ID at delivery. No delivery to vehicles or in public areas — must be a private residence. GPS tracking and electronic manifests required. No cash-only delivery operations.', SOURCE],
    ['NV', 'tax', 'NV cannabis tax: 15% excise tax on wholesale price (paid by retailer) + 10% retail excise tax + 8.375% Clark County sales tax (Las Vegas). Medical cannabis: 2% excise at wholesale only, no retail excise, standard 8.375% sales tax.', SOURCE],

    // =========================================================================
    // NEW JERSEY (NJ)
    // =========================================================================
    ['NJ', 'possession-limits', 'NJ adult recreational (21+): up to 6 oz (170g) flower in public. No home cultivation allowed. Regulator: CRC (Cannabis Regulatory Commission). Medical patients retain separate higher limits.', SOURCE],
    ['NJ', 'advertising', 'NJ CRC advertising rules: No advertising on media with >30% audience under 21. No billboard within 200 feet of schools or playgrounds. Must include "For Adults 21 and Over Only", "Keep Out Of Reach of Children", and CRC license number. No health claims. Social media age-gating required.', SOURCE],
    ['NJ', 'packaging', 'NJ packaging: Child-resistant, tamper-evident, opaque. Required labels: CRC license number, universal symbol, THC/CBD per serving and total, batch ID, expiration date, required health warnings. No images/text suggesting health benefits. No imagery appealing to minors.', SOURCE],
    ['NJ', 'delivery', 'NJ cannabis delivery: Legal with CRC delivery endorsement. Currently available to Class 5 (delivery) licensees and Class 1 retailers with endorsement. Age verification (21+) and government ID required at delivery. No delivery to public places. GPS tracking required.', SOURCE],
    ['NJ', 'tax', 'NJ cannabis tax: Social equity excise fee of $1.52/oz flower, $0.19/oz leaf, $3.00/oz trim (adjusts annually to CPI). Plus 6.625% state sales tax. Municipalities may charge up to 2% transfer tax. No medical cannabis tax for registered patients.', SOURCE],

    // =========================================================================
    // MICHIGAN (MI)
    // =========================================================================
    ['MI', 'possession-limits', 'MI adult recreational (21+): up to 2.5 oz (70g) in public, up to 10 oz at home. Home cultivation: up to 12 plants. Regulator: MRA (Marijuana Regulatory Agency) under LARA.', SOURCE],
    ['MI', 'advertising', 'MI MRA advertising rules: No advertising on channels or platforms where 30%+ of audience is under 21. No outdoor advertising within 500 feet of schools, public playgrounds, or churches. Must include "For Adults 21+ Only", "Keep Out of Reach of Children", and MRA license number. No health claims. No animated or cartoon characters.', SOURCE],
    ['MI', 'packaging', 'MI packaging: Child-resistant, tamper-evident, re-sealable. Opaque or not designed to appeal to minors. Must include: MRA licensee name/number, universal symbol, THC/CBD content, batch number, harvest/process date, weight, required health warnings. No imagery/wording that could appeal to minors.', SOURCE],
    ['MI', 'delivery', 'MI cannabis delivery: Legal for licensed retailers with state-issued delivery endorsement. Must use METRC for seed-to-sale tracking. Age and ID verification (21+) required at delivery. Delivery to residential addresses only — no delivery to commercial properties without prior approval. No simultaneous retail and delivery without separate manifests.', SOURCE],
    ['MI', 'tax', 'MI cannabis tax: 10% state excise tax on retail price + 6% state sales tax = 16% total. Municipalities may add up to 3% local excise. Ann Arbor charges 3%. Medical cannabis: 6% state sales tax only (no excise tax for registered patients).', SOURCE],
];

let seeded = 0;
let errors = 0;

console.log(`Seeding ${facts.length} compliance facts into BakedBot Hive Mind...`);
console.log('');

for (const [state, topic, rule, source] of facts) {
    try {
        await writeComplianceFact(state, topic, rule, source);
        seeded++;
        process.stdout.write(`✓ ${state}/${topic}\n`);
        // Brief pause to avoid hammering Letta API
        await new Promise(r => setTimeout(r, 200));
    } catch (err) {
        errors++;
        process.stderr.write(`✗ ${state}/${topic}: ${err.message}\n`);
    }
}

console.log('');
console.log(`Done. Seeded: ${seeded}/${facts.length}  Errors: ${errors}`);
if (errors > 0) {
    console.log('Re-run the script to retry failed facts. It is safe to run multiple times (Letta deduplicates by content similarity).');
    process.exit(1);
}
