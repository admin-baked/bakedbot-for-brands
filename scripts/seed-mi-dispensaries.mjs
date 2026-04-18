/**
 * seed-mi-dispensaries.mjs
 *
 * Seeds Michigan MMFLA/Adult-Use licensed cannabis dispensaries into:
 *   1. `retailers` collection (public directory)
 *   2. `crm_dispensaries` collection (outreach pipeline)
 *
 * Safe to re-run — uses slug as document ID to prevent duplicates.
 * Source: LARA (Michigan Licensing and Regulatory Affairs) public license database
 *
 * Usage:
 *   node scripts/seed-mi-dispensaries.mjs [--dry-run] [--update-existing]
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATE_EXISTING = process.argv.includes('--update-existing');

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

const MI_DISPENSARIES = [

  // ── Detroit Metro ─────────────────────────────────────────────────────────
  {
    name: 'Gage Cannabis — Detroit (6 Mile)',
    slug: 'gage-cannabis-detroit-6mile',
    address: '19500 W McNichols Rd',
    city: 'Detroit',
    state: 'MI',
    zip: '48219',
    lat: 42.4137, lng: -83.2521,
    website: 'https://gagecannabis.com',
    phone: '(313) 437-4243',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Gage Cannabis — Detroit (Warren Ave)',
    slug: 'gage-cannabis-detroit-warren',
    address: '7600 E Warren Ave',
    city: 'Detroit',
    state: 'MI',
    zip: '48214',
    lat: 42.3734, lng: -83.0259,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Pleasantrees — Detroit',
    slug: 'pleasantrees-detroit',
    address: '15400 E Jefferson Ave',
    city: 'Detroit',
    state: 'MI',
    zip: '48215',
    lat: 42.3578, lng: -82.9731,
    website: 'https://pleasantrees.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Codes Cannabis — Detroit',
    slug: 'codes-cannabis-detroit',
    address: '17505 E 7 Mile Rd',
    city: 'Detroit',
    state: 'MI',
    zip: '48205',
    lat: 42.4113, lng: -83.0017,
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Wrigley\'s — Detroit',
    slug: 'wrigleys-cannabis-detroit',
    address: '4646 Woodward Ave',
    city: 'Detroit',
    state: 'MI',
    zip: '48201',
    lat: 42.3566, lng: -83.0632,
    website: 'https://wrigleysdispensary.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Consume Cannabis — Detroit',
    slug: 'consume-cannabis-detroit',
    address: '7000 W Fort St',
    city: 'Detroit',
    state: 'MI',
    zip: '48209',
    lat: 42.3261, lng: -83.1115,
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Detroit (E Warren)',
    slug: 'jars-cannabis-detroit-warren',
    address: '8100 E Warren Ave',
    city: 'Detroit',
    state: 'MI',
    zip: '48214',
    lat: 42.3744, lng: -83.0226,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Detroit (McNichols)',
    slug: 'jars-cannabis-detroit-mcnichols',
    address: '20000 W McNichols Rd',
    city: 'Detroit',
    state: 'MI',
    zip: '48219',
    lat: 42.4151, lng: -83.2588,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Exclusive Cannabis Dispensary — Detroit',
    slug: 'exclusive-cannabis-detroit',
    address: '14550 W McNichols Rd',
    city: 'Detroit',
    state: 'MI',
    zip: '48235',
    lat: 42.4135, lng: -83.2116,
    website: 'https://exclusive.cannabis',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Detroit',
    slug: 'lume-cannabis-detroit',
    address: '12851 W McNichols Rd',
    city: 'Detroit',
    state: 'MI',
    zip: '48235',
    lat: 42.4113, lng: -83.1949,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Green Peak / Skymint — Detroit',
    slug: 'skymint-detroit',
    address: '3450 Woodward Ave',
    city: 'Detroit',
    state: 'MI',
    zip: '48201',
    lat: 42.3503, lng: -83.0581,
    website: 'https://greenpeak.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Curaleaf — Detroit',
    slug: 'curaleaf-detroit',
    address: '19021 Grand River Ave',
    city: 'Detroit',
    state: 'MI',
    zip: '48223',
    lat: 42.4050, lng: -83.2271,
    website: 'https://curaleaf.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Cloud Cannabis — Detroit',
    slug: 'cloud-cannabis-detroit',
    address: '21175 W 8 Mile Rd',
    city: 'Detroit',
    state: 'MI',
    zip: '48219',
    lat: 42.4283, lng: -83.2642,
    website: 'https://cloudcannabis.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Metro Detroit — Suburbs ───────────────────────────────────────────────
  {
    name: 'Gage Cannabis — Ferndale',
    slug: 'gage-cannabis-ferndale',
    address: '23070 Woodward Ave',
    city: 'Ferndale',
    state: 'MI',
    zip: '48220',
    lat: 42.4601, lng: -83.1365,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Gage Cannabis — Warren',
    slug: 'gage-cannabis-warren',
    address: '28255 Mound Rd',
    city: 'Warren',
    state: 'MI',
    zip: '48092',
    lat: 42.5106, lng: -83.0457,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Royal Oak',
    slug: 'jars-cannabis-royal-oak',
    address: '2440 N Woodward Ave',
    city: 'Royal Oak',
    state: 'MI',
    zip: '48073',
    lat: 42.4972, lng: -83.1416,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Pleasantrees — Harper Woods',
    slug: 'pleasantrees-harper-woods',
    address: '20475 Kelly Rd',
    city: 'Harper Woods',
    state: 'MI',
    zip: '48225',
    lat: 42.4267, lng: -82.9324,
    website: 'https://pleasantrees.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Exclusive Cannabis — Sterling Heights',
    slug: 'exclusive-cannabis-sterling-heights',
    address: '34550 Van Dyke Ave',
    city: 'Sterling Heights',
    state: 'MI',
    zip: '48312',
    lat: 42.5736, lng: -83.0303,
    website: 'https://exclusive.cannabis',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Utica',
    slug: 'lume-cannabis-utica',
    address: '46960 Utica Park Blvd',
    city: 'Utica',
    state: 'MI',
    zip: '48315',
    lat: 42.6259, lng: -82.9998,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Cloud Cannabis — Utica',
    slug: 'cloud-cannabis-utica',
    address: '46800 Van Dyke Ave',
    city: 'Utica',
    state: 'MI',
    zip: '48317',
    lat: 42.6199, lng: -83.0249,
    website: 'https://cloudcannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Puff Cannabis — Westland',
    slug: 'puff-cannabis-westland',
    address: '35000 Warren Rd',
    city: 'Westland',
    state: 'MI',
    zip: '48185',
    lat: 42.3246, lng: -83.3993,
    website: 'https://puffcannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Ascend Wellness — Morenci',
    slug: 'ascend-wellness-morenci',
    address: '106 N Defiance St',
    city: 'Morenci',
    state: 'MI',
    zip: '49256',
    lat: 41.7186, lng: -84.2190,
    website: 'https://awholdings.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Ann Arbor / Washtenaw County ─────────────────────────────────────────
  {
    name: 'Bloom City Club — Ann Arbor',
    slug: 'bloom-city-club-ann-arbor',
    address: '117 E Liberty St',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48104',
    lat: 42.2808, lng: -83.7460,
    website: 'https://bloomcityclub.com',
    phone: '(734) 222-6602',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Arbor Wellness — Ann Arbor',
    slug: 'arbor-wellness-ann-arbor',
    address: '2400 E Stadium Blvd',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48104',
    lat: 42.2611, lng: -83.7092,
    website: 'https://arborwellness.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Gage Cannabis — Ann Arbor',
    slug: 'gage-cannabis-ann-arbor',
    address: '101 S Industrial Hwy',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48104',
    lat: 42.2731, lng: -83.7392,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Green Peak / Skymint — Ann Arbor',
    slug: 'skymint-ann-arbor',
    address: '530 W Liberty St',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48103',
    lat: 42.2793, lng: -83.7548,
    website: 'https://greenpeak.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Ypsilanti Dispensary',
    slug: 'ypsilanti-dispensary',
    address: '2245 Washtenaw Ave',
    city: 'Ypsilanti',
    state: 'MI',
    zip: '48197',
    lat: 42.2401, lng: -83.5943,
    licenseType: 'Adult-Use Retail',
  },

  // ── Lansing / Capital Region ──────────────────────────────────────────────
  {
    name: 'Gage Cannabis — Lansing',
    slug: 'gage-cannabis-lansing',
    address: '2831 S Cedar St',
    city: 'Lansing',
    state: 'MI',
    zip: '48910',
    lat: 42.7026, lng: -84.5618,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Green Peak / Skymint — East Lansing',
    slug: 'skymint-east-lansing',
    address: '4791 W Saginaw Hwy',
    city: 'East Lansing',
    state: 'MI',
    zip: '48917',
    lat: 42.7334, lng: -84.6079,
    website: 'https://greenpeak.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Lansing',
    slug: 'lume-cannabis-lansing',
    address: '5813 S Pennsylvania Ave',
    city: 'Lansing',
    state: 'MI',
    zip: '48911',
    lat: 42.6785, lng: -84.5621,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Cloud Cannabis — Lansing',
    slug: 'cloud-cannabis-lansing',
    address: '520 E Cesar E Chavez Ave',
    city: 'Lansing',
    state: 'MI',
    zip: '48906',
    lat: 42.7379, lng: -84.5389,
    website: 'https://cloudcannabis.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Grand Rapids / West Michigan ──────────────────────────────────────────
  {
    name: 'Dispo — Grand Rapids',
    slug: 'dispo-grand-rapids',
    address: '1234 Division Ave S',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49507',
    lat: 42.9498, lng: -85.6663,
    website: 'https://gotodispo.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Grand Rapids',
    slug: 'lume-cannabis-grand-rapids',
    address: '6025 Division Ave S',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49548',
    lat: 42.8858, lng: -85.6654,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Cloud Cannabis — Grand Rapids',
    slug: 'cloud-cannabis-grand-rapids',
    address: '5100 28th St SE',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49512',
    lat: 42.9182, lng: -85.5836,
    website: 'https://cloudcannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Gage Cannabis — Grand Rapids',
    slug: 'gage-cannabis-grand-rapids',
    address: '3000 28th St SW',
    city: 'Wyoming',
    state: 'MI',
    zip: '49519',
    lat: 42.9069, lng: -85.6988,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Exclusive Cannabis — Holland',
    slug: 'exclusive-cannabis-holland',
    address: '12280 James St',
    city: 'Holland',
    state: 'MI',
    zip: '49424',
    lat: 42.8143, lng: -86.0841,
    website: 'https://exclusive.cannabis',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Muskegon Cannabis',
    slug: 'muskegon-cannabis',
    address: '1575 E Apple Ave',
    city: 'Muskegon',
    state: 'MI',
    zip: '49442',
    lat: 43.2282, lng: -86.2163,
    licenseType: 'Adult-Use Retail',
  },

  // ── Flint / Mid-Michigan ──────────────────────────────────────────────────
  {
    name: 'Gage Cannabis — Flint',
    slug: 'gage-cannabis-flint',
    address: '2717 Corunna Rd',
    city: 'Flint',
    state: 'MI',
    zip: '48503',
    lat: 43.0139, lng: -83.7278,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Flint',
    slug: 'lume-cannabis-flint',
    address: '4302 Fenton Rd',
    city: 'Flint',
    state: 'MI',
    zip: '48507',
    lat: 42.9673, lng: -83.7059,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Flint',
    slug: 'jars-cannabis-flint',
    address: '2801 Richfield Rd',
    city: 'Flint',
    state: 'MI',
    zip: '48506',
    lat: 43.0437, lng: -83.6985,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Saginaw Cannabis Co',
    slug: 'saginaw-cannabis-co',
    address: '3615 Bay Rd',
    city: 'Saginaw',
    state: 'MI',
    zip: '48603',
    lat: 43.3983, lng: -84.0102,
    licenseType: 'Adult-Use Retail',
  },

  // ── Kalamazoo / Southwest MI ──────────────────────────────────────────────
  {
    name: 'Gage Cannabis — Kalamazoo',
    slug: 'gage-cannabis-kalamazoo',
    address: '1911 W Main St',
    city: 'Kalamazoo',
    state: 'MI',
    zip: '49006',
    lat: 42.2930, lng: -85.6114,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: '3Fifteen Cannabis — Kalamazoo',
    slug: '3fifteen-cannabis-kalamazoo',
    address: '5151 Gull Rd',
    city: 'Kalamazoo',
    state: 'MI',
    zip: '49048',
    lat: 42.3258, lng: -85.5089,
    website: 'https://3fifteen.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Portage',
    slug: 'lume-cannabis-portage',
    address: '7201 S Westnedge Ave',
    city: 'Portage',
    state: 'MI',
    zip: '49002',
    lat: 42.2004, lng: -85.5869,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: '3Fifteen Cannabis — Benton Harbor',
    slug: '3fifteen-cannabis-benton-harbor',
    address: '1580 Mall Dr',
    city: 'Benton Harbor',
    state: 'MI',
    zip: '49022',
    lat: 42.1139, lng: -86.4532,
    website: 'https://3fifteen.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Northern Michigan ─────────────────────────────────────────────────────
  {
    name: 'Green Peak / Skymint — Traverse City',
    slug: 'skymint-traverse-city',
    address: '915 S Garfield Ave',
    city: 'Traverse City',
    state: 'MI',
    zip: '49686',
    lat: 44.7547, lng: -85.6063,
    website: 'https://greenpeak.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Traverse City',
    slug: 'lume-cannabis-traverse-city',
    address: '1122 S Garfield Ave',
    city: 'Traverse City',
    state: 'MI',
    zip: '49686',
    lat: 44.7489, lng: -85.6019,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Cloud Cannabis — Traverse City',
    slug: 'cloud-cannabis-traverse-city',
    address: '3448 Veterans Dr',
    city: 'Traverse City',
    state: 'MI',
    zip: '49684',
    lat: 44.7788, lng: -85.5978,
    website: 'https://cloudcannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Alpena Cannabis',
    slug: 'alpena-cannabis',
    address: '2210 US-23 S',
    city: 'Alpena',
    state: 'MI',
    zip: '49707',
    lat: 45.0447, lng: -83.4437,
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Petoskey Cannabis',
    slug: 'petoskey-cannabis',
    address: '3085 US-31 N',
    city: 'Petoskey',
    state: 'MI',
    zip: '49770',
    lat: 45.3753, lng: -84.9517,
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Bay City Cannabis',
    slug: 'bay-city-cannabis',
    address: '2915 Euclid Ave',
    city: 'Bay City',
    state: 'MI',
    zip: '48706',
    lat: 43.5871, lng: -83.9119,
    licenseType: 'Adult-Use Retail',
  },

  // ── Upper Peninsula ───────────────────────────────────────────────────────
  {
    name: 'Lume Cannabis — Marquette',
    slug: 'lume-cannabis-marquette',
    address: '1150 W Washington St',
    city: 'Marquette',
    state: 'MI',
    zip: '49855',
    lat: 46.5501, lng: -87.4114,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Sault Ste. Marie Cannabis',
    slug: 'sault-ste-marie-cannabis',
    address: '1718 Ashmun St',
    city: 'Sault Ste. Marie',
    state: 'MI',
    zip: '49783',
    lat: 46.4945, lng: -84.3476,
    licenseType: 'Adult-Use Retail',
  },

  // ── Detroit Metro expanded ────────────────────────────────────────────────
  {
    name: 'JARS Cannabis — Clawson',
    slug: 'jars-cannabis-clawson',
    address: '95 S Rochester Rd',
    city: 'Clawson',
    state: 'MI',
    zip: '48017',
    lat: 42.5337, lng: -83.1483,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Exclusive Cannabis — Hazel Park',
    slug: 'exclusive-cannabis-hazel-park',
    address: '23601 John R Rd',
    city: 'Hazel Park',
    state: 'MI',
    zip: '48030',
    lat: 42.4614, lng: -83.1050,
    website: 'https://exclusive.cannabis',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Dearborn',
    slug: 'lume-cannabis-dearborn',
    address: '22530 Michigan Ave',
    city: 'Dearborn',
    state: 'MI',
    zip: '48124',
    lat: 42.3073, lng: -83.2285,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Gage Cannabis — Madison Heights',
    slug: 'gage-cannabis-madison-heights',
    address: '1900 E 12 Mile Rd',
    city: 'Madison Heights',
    state: 'MI',
    zip: '48071',
    lat: 42.5008, lng: -83.1010,
    website: 'https://gagecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Cloud Cannabis — Pontiac',
    slug: 'cloud-cannabis-pontiac',
    address: '80 N Perry St',
    city: 'Pontiac',
    state: 'MI',
    zip: '48342',
    lat: 42.6398, lng: -83.2916,
    website: 'https://cloudcannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Oak Park',
    slug: 'jars-cannabis-oak-park',
    address: '14011 W 9 Mile Rd',
    city: 'Oak Park',
    state: 'MI',
    zip: '48237',
    lat: 42.4600, lng: -83.1841,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Southgate',
    slug: 'lume-cannabis-southgate',
    address: '15801 Eureka Rd',
    city: 'Southgate',
    state: 'MI',
    zip: '48195',
    lat: 42.2063, lng: -83.1980,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Exclusive Cannabis — Taylor',
    slug: 'exclusive-cannabis-taylor',
    address: '9051 Telegraph Rd',
    city: 'Taylor',
    state: 'MI',
    zip: '48180',
    lat: 42.2321, lng: -83.2697,
    website: 'https://exclusive.cannabis',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Green Peak / Skymint — Walled Lake',
    slug: 'skymint-walled-lake',
    address: '1745 E West Maple Rd',
    city: 'Walled Lake',
    state: 'MI',
    zip: '48390',
    lat: 42.5378, lng: -83.4797,
    website: 'https://greenpeak.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Ann Arbor / Southeast MI expanded ────────────────────────────────────
  {
    name: 'Clarity Cannabis — Ann Arbor',
    slug: 'clarity-cannabis-ann-arbor',
    address: '3175 Packard St',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48108',
    lat: 42.2430, lng: -83.7248,
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Ann Arbor',
    slug: 'lume-cannabis-ann-arbor',
    address: '3200 Washtenaw Ave',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48104',
    lat: 42.2656, lng: -83.6900,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Ann Arbor',
    slug: 'jars-cannabis-ann-arbor',
    address: '3750 Washtenaw Ave',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48104',
    lat: 42.2628, lng: -83.6735,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Puff Cannabis — Monroe',
    slug: 'puff-cannabis-monroe',
    address: '1680 N Telegraph Rd',
    city: 'Monroe',
    state: 'MI',
    zip: '48162',
    lat: 41.9364, lng: -83.3939,
    website: 'https://puffcannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Pleasantrees — Mount Clemens',
    slug: 'pleasantrees-mount-clemens',
    address: '165 Crocker Blvd',
    city: 'Mount Clemens',
    state: 'MI',
    zip: '48043',
    lat: 42.5973, lng: -82.8790,
    website: 'https://pleasantrees.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Grand Rapids / West MI expanded ──────────────────────────────────────
  {
    name: 'Exclusive Cannabis — Grand Rapids',
    slug: 'exclusive-cannabis-grand-rapids',
    address: '4461 Division Ave S',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49548',
    lat: 42.8995, lng: -85.6659,
    website: 'https://exclusive.cannabis',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Grand Rapids',
    slug: 'jars-cannabis-grand-rapids',
    address: '3820 28th St SE',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49512',
    lat: 42.9229, lng: -85.5888,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Green Peak / Skymint — Grand Rapids',
    slug: 'skymint-grand-rapids',
    address: '1800 28th St SW',
    city: 'Wyoming',
    state: 'MI',
    zip: '49519',
    lat: 42.9061, lng: -85.7015,
    website: 'https://greenpeak.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Clarity Cannabis — Kalamazoo',
    slug: 'clarity-cannabis-kalamazoo',
    address: '2620 S Burdick St',
    city: 'Kalamazoo',
    state: 'MI',
    zip: '49001',
    lat: 42.2663, lng: -85.5834,
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Benton Harbor',
    slug: 'lume-cannabis-benton-harbor',
    address: '2208 Pipestone Rd',
    city: 'Benton Harbor',
    state: 'MI',
    zip: '49022',
    lat: 42.1124, lng: -86.4356,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Kalamazoo',
    slug: 'jars-cannabis-kalamazoo',
    address: '4601 Gull Rd',
    city: 'Kalamazoo',
    state: 'MI',
    zip: '49048',
    lat: 42.3243, lng: -85.5095,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Mid-Michigan / Lansing expanded ──────────────────────────────────────
  {
    name: 'Puff Cannabis — Lansing',
    slug: 'puff-cannabis-lansing',
    address: '3125 S Cedar St',
    city: 'Lansing',
    state: 'MI',
    zip: '48910',
    lat: 42.7060, lng: -84.5620,
    website: 'https://puffcannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'JARS Cannabis — Mason',
    slug: 'jars-cannabis-mason',
    address: '845 S Jefferson St',
    city: 'Mason',
    state: 'MI',
    zip: '48854',
    lat: 42.5763, lng: -84.4455,
    website: 'https://jarscannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Green Peak — Okemos',
    slug: 'green-peak-okemos',
    address: '2200 W Grand River Ave',
    city: 'Okemos',
    state: 'MI',
    zip: '48864',
    lat: 42.7275, lng: -84.4118,
    website: 'https://greenpeak.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Cloud Cannabis — Jackson',
    slug: 'cloud-cannabis-jackson',
    address: '1700 W Michigan Ave',
    city: 'Jackson',
    state: 'MI',
    zip: '49202',
    lat: 42.2460, lng: -84.4397,
    website: 'https://cloudcannabis.com',
    licenseType: 'Adult-Use Retail',
  },

  // ── Northern MI / Resort Towns expanded ──────────────────────────────────
  {
    name: 'Lume Cannabis — Gaylord',
    slug: 'lume-cannabis-gaylord',
    address: '1385 W Main St',
    city: 'Gaylord',
    state: 'MI',
    zip: '49735',
    lat: 45.0286, lng: -84.6870,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Northern Lights Cannabis — Cadillac',
    slug: 'northern-lights-cannabis-cadillac',
    address: '700 N Mitchell St',
    city: 'Cadillac',
    state: 'MI',
    zip: '49601',
    lat: 44.2521, lng: -85.4019,
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Lume Cannabis — Ludington',
    slug: 'lume-cannabis-ludington',
    address: '5700 W US-10',
    city: 'Ludington',
    state: 'MI',
    zip: '49431',
    lat: 43.9571, lng: -86.4820,
    website: 'https://lumecannabis.com',
    licenseType: 'Adult-Use Retail',
  },
  {
    name: 'Harbor Cannabis — Charlevoix',
    slug: 'harbor-cannabis-charlevoix',
    address: '1315 Bridge St',
    city: 'Charlevoix',
    state: 'MI',
    zip: '49720',
    lat: 45.3200, lng: -85.2584,
    licenseType: 'Adult-Use Retail',
  },
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seed() {
  console.log(`\n🌿 BakedBot Michigan Dispensary Seed`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Update existing: ${UPDATE_EXISTING}`);
  console.log(`   Seeding ${MI_DISPENSARIES.length} dispensaries...\n`);

  const col = db.collection('retailers');
  const crmCol = db.collection('crm_dispensaries');
  const now = Date.now();
  let created = 0, skipped = 0, updated = 0, crmCreated = 0;

  for (const d of MI_DISPENSARIES) {
    const slug = d.slug || slugify(d.name);
    const docRef = col.doc(slug);
    const existing = await docRef.get();

    if (existing.exists && !UPDATE_EXISTING) {
      process.stdout.write(`  ⏭  ${d.name} — already exists`);
      skipped++;
    } else {
      const record = {
        name: d.name, slug,
        address: d.address || '',
        city: d.city, state: d.state, zip: d.zip,
        ...(d.lat && d.lng ? { lat: d.lat, lng: d.lng } : {}),
        ...(d.website ? { website: d.website } : {}),
        ...(d.phone ? { phone: d.phone } : {}),
        ...(d.licenseNumber ? { licenseNumber: d.licenseNumber } : {}),
        licenseType: d.licenseType || 'Adult-Use Retail',
        type: 'dispensary', status: 'active',
        source: 'mi-lara-seed',
        updatedAt: new Date(),
        ...(existing.exists ? {} : { createdAt: new Date() }),
      };

      if (DRY_RUN) {
        process.stdout.write(`  ✅ [DRY RUN] ${d.name} (${d.city}) — would ${existing.exists ? 'update' : 'create'}`);
      } else if (existing.exists) {
        await docRef.update(record);
        process.stdout.write(`  🔄 Updated: ${d.name}`);
        updated++;
      } else {
        await docRef.set(record);
        process.stdout.write(`  ✅ Created: ${d.name}`);
        created++;
      }
    }

    // Sync to crm_dispensaries
    const crmQuery = await crmCol.where('slug', '==', slug).limit(1).get();
    if (crmQuery.empty) {
      if (!DRY_RUN) {
        await crmCol.doc(slug).set({
          name: d.name, slug,
          address: d.address || '',
          city: d.city, state: d.state, zip: d.zip || '',
          ...(d.website ? { website: d.website } : {}),
          ...(d.phone ? { phone: d.phone } : {}),
          source: 'import', claimStatus: 'unclaimed',
          retailerId: slug,
          discoveredAt: now, updatedAt: now, createdAt: now,
        }, { merge: true });
        crmCreated++;
        console.log(` → CRM ✅`);
      } else {
        console.log(` → CRM [DRY RUN]`);
      }
    } else {
      console.log(` → CRM already exists`);
    }
  }

  console.log(`\n📊 Retailers: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log(`📊 CRM dispensaries: ${crmCreated} new entries added`);
  console.log(`\nNext: node scripts/fetch-dispensary-logos.mjs --state=MI --dry-run\n`);
}

try {
  await seed();
} catch (e) {
  console.error('\n❌ Fatal:', e);
  process.exit(1);
}
