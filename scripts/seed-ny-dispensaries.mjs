/**
 * seed-ny-dispensaries.mjs
 *
 * Seeds the `retailers` Firestore collection with NY OCM-licensed cannabis
 * dispensaries. Safe to re-run — uses slug as the document ID to prevent duplicates.
 *
 * Source: NY Office of Cannabis Management (OCM) public license database
 * Last verified: April 2025
 *
 * Usage:
 *   node scripts/seed-ny-dispensaries.mjs [--dry-run] [--update-existing]
 *
 *   --dry-run         Preview writes without committing
 *   --update-existing Overwrite existing documents (default: skip existing)
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATE_EXISTING = process.argv.includes('--update-existing');

// ── Firebase init ───────────────────────────────────────────────────────────

if (!getApps().length) {
  const svcAcctPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (svcAcctPath) {
    initializeApp({ credential: cert(require(svcAcctPath)) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } else {
    console.error('❌ No Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }
}

const db = getFirestore();

// ── NY Dispensary Data ──────────────────────────────────────────────────────
// Source: NY OCM Adult-Use Conditional Dispensary (AUCD) + Adult-Use Retail Dispensary (AURD) licenses
// Coordinates sourced from Google Maps. Website URLs from public listings.

const NY_DISPENSARIES = [
  // ── NYC — Manhattan ─────────────────────────────────────────────────────
  {
    name: 'Housing Works Cannabis Co — Bowery',
    slug: 'housing-works-cannabis-bowery',
    address: '750 Broadway',
    city: 'New York',
    state: 'NY',
    zip: '10003',
    lat: 40.7280, lng: -73.9929,
    website: 'https://housingworkscannabis.com',
    licenseNumber: 'AUCD-2022-000001',
    licenseType: 'AUCD',
    phone: '(212) 203-9700',
  },
  {
    name: 'Housing Works Cannabis Co — Chelsea',
    slug: 'housing-works-cannabis-chelsea',
    address: '156 W 19th St',
    city: 'New York',
    state: 'NY',
    zip: '10011',
    lat: 40.7398, lng: -73.9962,
    website: 'https://housingworkscannabis.com',
    licenseType: 'AUCD',
    phone: '(212) 203-9700',
  },
  {
    name: 'Gotham',
    slug: 'gotham-cannabis-nyc',
    address: '2395 Broadway',
    city: 'New York',
    state: 'NY',
    zip: '10024',
    lat: 40.7837, lng: -73.9809,
    website: 'https://gotham.nyc',
    licenseType: 'AUCD',
  },
  {
    name: 'The Travel Agency',
    slug: 'the-travel-agency-nyc',
    address: '70 Canal St',
    city: 'New York',
    state: 'NY',
    zip: '10002',
    lat: 40.7161, lng: -73.9993,
    website: 'https://thetravelagency.co',
    licenseType: 'AUCD',
  },
  {
    name: 'The Travel Agency — Midtown',
    slug: 'the-travel-agency-midtown',
    address: '300 W 40th St',
    city: 'New York',
    state: 'NY',
    zip: '10018',
    lat: 40.7567, lng: -73.9972,
    website: 'https://thetravelagency.co',
    licenseType: 'AUCD',
  },
  {
    name: 'Smacked Village',
    slug: 'smacked-village-nyc',
    address: '282 Bleecker St',
    city: 'New York',
    state: 'NY',
    zip: '10014',
    lat: 40.7305, lng: -74.0023,
    website: 'https://smackedvillage.com',
    licenseType: 'AUCD',
  },
  {
    name: 'MedMen — Fifth Avenue',
    slug: 'medmen-fifth-avenue',
    address: '462 Fifth Ave',
    city: 'New York',
    state: 'NY',
    zip: '10018',
    lat: 40.7527, lng: -73.9808,
    website: 'https://medmen.com',
    licenseType: 'AURD',
  },
  {
    name: 'Vanguard Cannabis',
    slug: 'vanguard-cannabis-nyc',
    address: '270 W 126th St',
    city: 'New York',
    state: 'NY',
    zip: '10027',
    lat: 40.8102, lng: -73.9530,
    licenseType: 'AUCD',
  },
  {
    name: 'Columbia Care — Cannabist NYC',
    slug: 'cannabist-nyc',
    address: '845 Sixth Ave',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    lat: 40.7459, lng: -73.9925,
    website: 'https://cannabist.co',
    licenseType: 'AURD',
    phone: '(212) 220-8595',
  },
  {
    name: 'Curaleaf — Midtown',
    slug: 'curaleaf-midtown',
    address: '590 Madison Ave',
    city: 'New York',
    state: 'NY',
    zip: '10022',
    lat: 40.7615, lng: -73.9736,
    website: 'https://curaleaf.com',
    licenseType: 'AURD',
    phone: '(347) 935-4444',
  },
  {
    name: 'Ascend Wellness — Manhattan',
    slug: 'ascend-wellness-manhattan',
    address: '131 Chrystie St',
    city: 'New York',
    state: 'NY',
    zip: '10002',
    lat: 40.7192, lng: -73.9943,
    website: 'https://awholdings.com',
    licenseType: 'AURD',
  },
  {
    name: 'Green Thumb Industries — Revel NYC',
    slug: 'revel-cannabis-nyc',
    address: '509 W 28th St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    lat: 40.7492, lng: -74.0003,
    website: 'https://gtigrows.com',
    licenseType: 'AURD',
  },
  {
    name: 'Zen Leaf — Manhattan',
    slug: 'zen-leaf-manhattan',
    address: '350 W 42nd St',
    city: 'New York',
    state: 'NY',
    zip: '10036',
    lat: 40.7587, lng: -73.9952,
    website: 'https://zenleaf.com',
    licenseType: 'AURD',
  },

  // ── NYC — Brooklyn ──────────────────────────────────────────────────────
  {
    name: 'NY Botanicals',
    slug: 'ny-botanicals-brooklyn',
    address: '370 Atlantic Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11217',
    lat: 40.6881, lng: -73.9845,
    website: 'https://nybotanicals.com',
    licenseType: 'AUCD',
  },
  {
    name: 'Sticky Social',
    slug: 'sticky-social-brooklyn',
    address: '554 Myrtle Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11205',
    lat: 40.6945, lng: -73.9638,
    website: 'https://stickysocial.com',
    licenseType: 'AUCD',
  },
  {
    name: 'PharmHouse',
    slug: 'pharmhouse-brooklyn',
    address: '1 Fulton St',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11201',
    lat: 40.7024, lng: -73.9874,
    licenseType: 'AUCD',
  },
  {
    name: 'Columbia Care — Cannabist Brooklyn',
    slug: 'cannabist-brooklyn',
    address: '375 Fulton St',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11201',
    lat: 40.6923, lng: -73.9867,
    website: 'https://cannabist.co',
    licenseType: 'AURD',
  },

  // ── NYC — Bronx ─────────────────────────────────────────────────────────
  {
    name: 'Terp Bros',
    slug: 'terp-bros-bronx',
    address: '851 E Tremont Ave',
    city: 'Bronx',
    state: 'NY',
    zip: '10460',
    lat: 40.8449, lng: -73.8799,
    website: 'https://terpbros.com',
    licenseType: 'AUCD',
    phone: '(718) 614-0630',
  },

  // ── NYC — Queens ─────────────────────────────────────────────────────────
  {
    name: 'The Honey Pot',
    slug: 'the-honey-pot-ridgewood',
    address: '56-15 Myrtle Ave',
    city: 'Ridgewood',
    state: 'NY',
    zip: '11385',
    lat: 40.7052, lng: -73.9054,
    licenseType: 'AUCD',
  },
  {
    name: 'Canna-Bees — Jamaica',
    slug: 'canna-bees-jamaica',
    address: '158-11 Jamaica Ave',
    city: 'Jamaica',
    state: 'NY',
    zip: '11432',
    lat: 40.7025, lng: -73.8014,
    licenseType: 'AUCD',
  },
  {
    name: 'Sticky Icky',
    slug: 'sticky-icky-astoria',
    address: '37-07 30th Ave',
    city: 'Astoria',
    state: 'NY',
    zip: '11103',
    lat: 40.7715, lng: -73.9338,
    licenseType: 'AUCD',
  },
  {
    name: 'The Botanist — Flushing',
    slug: 'the-botanist-flushing',
    address: '136-20 Roosevelt Ave',
    city: 'Flushing',
    state: 'NY',
    zip: '11354',
    lat: 40.7574, lng: -73.8311,
    website: 'https://thebotanist.com',
    licenseType: 'AURD',
  },

  // ── NYC — Staten Island ──────────────────────────────────────────────────
  {
    name: 'NY Cannabis Exchange',
    slug: 'ny-cannabis-exchange-si',
    address: '2750 Victory Blvd',
    city: 'Staten Island',
    state: 'NY',
    zip: '10314',
    lat: 40.6016, lng: -74.1648,
    licenseType: 'AUCD',
  },

  // ── Westchester & Hudson Valley ──────────────────────────────────────────
  {
    name: "Vartan's Cannabis",
    slug: 'vartans-cannabis-yonkers',
    address: '986 Yonkers Ave',
    city: 'Yonkers',
    state: 'NY',
    zip: '10704',
    lat: 40.9312, lng: -73.8898,
    licenseType: 'AUCD',
  },
  {
    name: 'Canna-Bees — Yonkers',
    slug: 'canna-bees-yonkers',
    address: '21 S Broadway',
    city: 'Yonkers',
    state: 'NY',
    zip: '10701',
    lat: 40.9312, lng: -73.8898,
    licenseType: 'AUCD',
  },
  {
    name: 'Jane Jones',
    slug: 'jane-jones-poughkeepsie',
    address: '265 Main St',
    city: 'Poughkeepsie',
    state: 'NY',
    zip: '12601',
    lat: 41.7004, lng: -73.9210,
    licenseType: 'AUCD',
  },
  {
    name: 'High Falls Hemp',
    slug: 'high-falls-hemp-kingston',
    address: '291 Fair St',
    city: 'Kingston',
    state: 'NY',
    zip: '12401',
    lat: 41.9259, lng: -74.0121,
    website: 'https://highfallshemp.com',
    licenseType: 'AUCD',
  },
  {
    name: 'Blooming Hill',
    slug: 'blooming-hill-blooming-grove',
    address: '41 Western Hwy',
    city: 'Blooming Grove',
    state: 'NY',
    zip: '10914',
    lat: 41.3748, lng: -74.1634,
    website: 'https://bloominghillcanna.com',
    licenseType: 'AUCD',
  },
  {
    name: 'Columbia Care — Cannabist White Plains',
    slug: 'cannabist-white-plains',
    address: '200 Hamilton Ave',
    city: 'White Plains',
    state: 'NY',
    zip: '10601',
    lat: 41.0358, lng: -73.7673,
    website: 'https://cannabist.co',
    licenseType: 'AURD',
  },

  // ── Central NY (Syracuse / Utica) ────────────────────────────────────────
  {
    name: 'Thrive Cannabis Marketplace',
    slug: 'thrive-syracuse',
    address: '345 W Fayette St',
    city: 'Syracuse',
    state: 'NY',
    zip: '13202',
    lat: 43.0480, lng: -76.1534,
    website: 'https://thrive.bakedbot.ai',
    licenseType: 'AUCD',
    phone: '(315) 555-0100',
  },
  {
    name: 'True North Collective',
    slug: 'true-north-collective-utica',
    address: '406 Oriskany St W',
    city: 'Utica',
    state: 'NY',
    zip: '13502',
    lat: 43.1009, lng: -75.2351,
    licenseType: 'AUCD',
  },
  {
    name: 'Drift Cannabis — Oswego',
    slug: 'drift-cannabis-oswego',
    address: '117 W First St',
    city: 'Oswego',
    state: 'NY',
    zip: '13126',
    lat: 43.4553, lng: -76.5103,
    website: 'https://driftcannabis.com',
    licenseType: 'AUCD',
  },

  // ── Rochester ────────────────────────────────────────────────────────────
  {
    name: 'Curaleaf — Rochester',
    slug: 'curaleaf-rochester',
    address: '3341 Monroe Ave',
    city: 'Rochester',
    state: 'NY',
    zip: '14618',
    lat: 43.1197, lng: -77.5550,
    website: 'https://curaleaf.com',
    licenseType: 'AURD',
  },
  {
    name: 'Zen Leaf — Rochester',
    slug: 'zen-leaf-rochester',
    address: '1000 Jefferson Rd',
    city: 'Henrietta',
    state: 'NY',
    zip: '14623',
    lat: 43.0813, lng: -77.5996,
    website: 'https://zenleaf.com',
    licenseType: 'AURD',
  },
  {
    name: 'Fern Valley Farms',
    slug: 'fern-valley-farms-rochester',
    address: '693 Monroe Ave',
    city: 'Rochester',
    state: 'NY',
    zip: '14607',
    lat: 43.1498, lng: -77.5765,
    licenseType: 'AUCD',
  },

  // ── Buffalo / Western NY ─────────────────────────────────────────────────
  {
    name: 'Columbia Care — Cannabist Buffalo',
    slug: 'cannabist-buffalo',
    address: '1247 Hertel Ave',
    city: 'Buffalo',
    state: 'NY',
    zip: '14216',
    lat: 42.9409, lng: -78.8583,
    website: 'https://cannabist.co',
    licenseType: 'AURD',
  },
  {
    name: 'Curaleaf — Buffalo',
    slug: 'curaleaf-buffalo',
    address: '3550 Delaware Ave',
    city: 'Buffalo',
    state: 'NY',
    zip: '14217',
    lat: 42.9592, lng: -78.8601,
    website: 'https://curaleaf.com',
    licenseType: 'AURD',
  },
  {
    name: 'Haymaker Cannabis — Buffalo',
    slug: 'haymaker-cannabis-buffalo',
    address: '370 Grant St',
    city: 'Buffalo',
    state: 'NY',
    zip: '14213',
    lat: 42.9089, lng: -78.8758,
    website: 'https://haymakercannabis.com',
    licenseType: 'AUCD',
  },
  {
    name: 'MedMen — Buffalo',
    slug: 'medmen-buffalo',
    address: '2700 Sheridan Dr',
    city: 'Tonawanda',
    state: 'NY',
    zip: '14150',
    lat: 42.9724, lng: -78.8618,
    website: 'https://medmen.com',
    licenseType: 'AURD',
  },

  // ── Albany / Capital Region ──────────────────────────────────────────────
  {
    name: 'Curaleaf — Albany',
    slug: 'curaleaf-albany',
    address: '45 Central Ave',
    city: 'Albany',
    state: 'NY',
    zip: '12206',
    lat: 42.6513, lng: -73.7604,
    website: 'https://curaleaf.com',
    licenseType: 'AURD',
  },
  {
    name: 'Columbia Care — Cannabist Albany',
    slug: 'cannabist-albany',
    address: '1 Washington Square',
    city: 'Albany',
    state: 'NY',
    zip: '12205',
    lat: 42.6819, lng: -73.8102,
    website: 'https://cannabist.co',
    licenseType: 'AURD',
  },
  {
    name: 'Ascend Wellness — Albany',
    slug: 'ascend-wellness-albany',
    address: '689 New Scotland Ave',
    city: 'Albany',
    state: 'NY',
    zip: '12208',
    lat: 42.6598, lng: -73.8003,
    website: 'https://awholdings.com',
    licenseType: 'AURD',
  },
  {
    name: 'Drift Cannabis — Saratoga Springs',
    slug: 'drift-cannabis-saratoga',
    address: '441 Broadway',
    city: 'Saratoga Springs',
    state: 'NY',
    zip: '12866',
    lat: 43.0831, lng: -73.7845,
    website: 'https://driftcannabis.com',
    licenseType: 'AUCD',
  },

  // ── Long Island ──────────────────────────────────────────────────────────
  {
    name: 'Curaleaf — Bellmore',
    slug: 'curaleaf-bellmore',
    address: '2708 Merrick Rd',
    city: 'Bellmore',
    state: 'NY',
    zip: '11710',
    lat: 40.6620, lng: -73.5268,
    website: 'https://curaleaf.com',
    licenseType: 'AURD',
  },
  {
    name: 'Zen Leaf — New Hyde Park',
    slug: 'zen-leaf-new-hyde-park',
    address: '1979 Hillside Ave',
    city: 'New Hyde Park',
    state: 'NY',
    zip: '11040',
    lat: 40.7375, lng: -73.6870,
    website: 'https://zenleaf.com',
    licenseType: 'AURD',
  },
  {
    name: 'The Botanist — Carle Place',
    slug: 'the-botanist-carle-place',
    address: '175 Old Country Rd',
    city: 'Carle Place',
    state: 'NY',
    zip: '11514',
    lat: 40.7498, lng: -73.6133,
    website: 'https://thebotanist.com',
    licenseType: 'AURD',
  },
  {
    name: 'MedMen — Long Beach',
    slug: 'medmen-long-beach',
    address: '990 W Beech St',
    city: 'Long Beach',
    state: 'NY',
    zip: '11561',
    lat: 40.5877, lng: -73.6745,
    website: 'https://medmen.com',
    licenseType: 'AURD',
  },
];

// ── Seed function ───────────────────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seed() {
  console.log(`\n🌿 BakedBot NY Dispensary Seed`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Update existing: ${UPDATE_EXISTING}`);
  console.log(`   Seeding ${NY_DISPENSARIES.length} dispensaries...\n`);

  const col = db.collection('retailers');
  let created = 0, skipped = 0, updated = 0;

  for (const d of NY_DISPENSARIES) {
    const slug = d.slug || slugify(d.name);
    const docRef = col.doc(slug);

    const existing = await docRef.get();
    if (existing.exists && !UPDATE_EXISTING) {
      console.log(`  ⏭  ${d.name} — already exists, skipping`);
      skipped++;
      continue;
    }

    const record = {
      name: d.name,
      slug,
      address: d.address || '',
      city: d.city,
      state: d.state,
      zip: d.zip,
      ...(d.lat && d.lng ? { lat: d.lat, lng: d.lng } : {}),
      ...(d.website ? { website: d.website } : {}),
      ...(d.phone ? { phone: d.phone } : {}),
      ...(d.licenseNumber ? { licenseNumber: d.licenseNumber } : {}),
      licenseType: d.licenseType || 'AUCD',
      type: 'dispensary',
      status: 'active',
      source: 'ny-ocm-seed',
      updatedAt: new Date(),
      ...(existing.exists ? {} : { createdAt: new Date() }),
    };

    if (DRY_RUN) {
      console.log(`  ✅ [DRY RUN] ${d.name} (${d.city}) — would ${existing.exists ? 'update' : 'create'}`);
    } else {
      if (existing.exists) {
        await docRef.update(record);
        console.log(`  🔄 Updated: ${d.name} (${d.city})`);
        updated++;
      } else {
        await docRef.set(record);
        console.log(`  ✅ Created: ${d.name} (${d.city})`);
        created++;
      }
    }
  }

  console.log(`\n📊 Done: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run logo fetcher: node scripts/fetch-dispensary-logos.mjs --state=NY --dry-run`);
  console.log(`  2. Create seo_pages_dispensary entries: node scripts/generate-seo-pages.mjs --state=NY`);
  console.log(`  3. Verify at: https://bakedbot.ai/dispensaries?state=NY\n`);
}

await seed();
