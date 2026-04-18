/**
 * seed-il-dispensaries.mjs
 *
 * Seeds Illinois IDFPR-licensed cannabis dispensaries into:
 *   1. `retailers` collection (public directory)
 *   2. `crm_dispensaries` collection (outreach pipeline)
 *
 * Safe to re-run — uses slug as document ID.
 * Source: Illinois Department of Financial and Professional Regulation (IDFPR) public database
 *
 * Usage:
 *   node scripts/seed-il-dispensaries.mjs [--dry-run] [--update-existing]
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

const IL_DISPENSARIES = [

  // ── Chicago — Loop / West Loop / South Loop ────────────────────────────────
  {
    name: 'Sunnyside — Wrigleyville',
    slug: 'sunnyside-wrigleyville',
    address: '3542 N Clark St',
    city: 'Chicago',
    state: 'IL',
    zip: '60657',
    lat: 41.9491, lng: -87.6576,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Lincoln Park',
    slug: 'sunnyside-lincoln-park',
    address: '1745 N Milwaukee Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60647',
    lat: 41.9149, lng: -87.6716,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Lakeview',
    slug: 'sunnyside-lakeview',
    address: '3317 N Broadway',
    city: 'Chicago',
    state: 'IL',
    zip: '60657',
    lat: 41.9448, lng: -87.6451,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Dispensary 33 — Andersonville',
    slug: 'dispensary-33-andersonville',
    address: '5439 N Clark St',
    city: 'Chicago',
    state: 'IL',
    zip: '60640',
    lat: 41.9796, lng: -87.6561,
    website: 'https://dispensary33.com',
    phone: '(773) 878-3733',
    licenseType: 'Adult Use',
  },
  {
    name: 'Dispensary 33 — Fulton Market',
    slug: 'dispensary-33-fulton-market',
    address: '955 W Fulton Market',
    city: 'Chicago',
    state: 'IL',
    zip: '60607',
    lat: 41.8864, lng: -87.6530,
    website: 'https://dispensary33.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Ivy Hall — Lincoln Park',
    slug: 'ivy-hall-lincoln-park',
    address: '2025 N Clybourn Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60614',
    lat: 41.9238, lng: -87.6627,
    website: 'https://ivyhall.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Ivy Hall — Wicker Park',
    slug: 'ivy-hall-wicker-park',
    address: '1745 W North Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60622',
    lat: 41.9101, lng: -87.6752,
    website: 'https://ivyhall.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Ivy Hall — Evanston',
    slug: 'ivy-hall-evanston',
    address: '819 Dempster St',
    city: 'Evanston',
    state: 'IL',
    zip: '60201',
    lat: 42.0464, lng: -87.6880,
    website: 'https://ivyhall.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Nature\'s Care — Chicago',
    slug: 'natures-care-chicago',
    address: '2365 N Clybourn Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60614',
    lat: 41.9270, lng: -87.6605,
    website: 'https://naturescare.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Chicago (Michigan Ave)',
    slug: 'curaleaf-chicago-michigan',
    address: '214 S Michigan Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60604',
    lat: 41.8793, lng: -87.6244,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Chicago (Logan Square)',
    slug: 'curaleaf-chicago-logan-square',
    address: '2800 N Milwaukee Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60618',
    lat: 41.9352, lng: -87.7002,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Zen Leaf — Chicago',
    slug: 'zen-leaf-chicago',
    address: '1527 N Wells St',
    city: 'Chicago',
    state: 'IL',
    zip: '60610',
    lat: 41.9109, lng: -87.6375,
    website: 'https://zenleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Ascend Wellness — Chicago',
    slug: 'ascend-wellness-chicago',
    address: '2847 N Clark St',
    city: 'Chicago',
    state: 'IL',
    zip: '60657',
    lat: 41.9379, lng: -87.6448,
    website: 'https://awholdings.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Revel — Chicago (GTI)',
    slug: 'revel-cannabis-chicago',
    address: '352 N Clark St',
    city: 'Chicago',
    state: 'IL',
    zip: '60654',
    lat: 41.8876, lng: -87.6313,
    website: 'https://gtigrows.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Cannabist — Chicago',
    slug: 'cannabist-chicago',
    address: '1001 N Clark St',
    city: 'Chicago',
    state: 'IL',
    zip: '60610',
    lat: 41.9013, lng: -87.6310,
    website: 'https://cannabist.co',
    licenseType: 'Adult Use',
  },
  {
    name: 'Verilife — Chicago',
    slug: 'verilife-chicago',
    address: '1301 S Wabash Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60605',
    lat: 41.8668, lng: -87.6258,
    website: 'https://verilife.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Maribis — Chicago',
    slug: 'maribis-chicago',
    address: '3240 W Irving Park Rd',
    city: 'Chicago',
    state: 'IL',
    zip: '60618',
    lat: 41.9540, lng: -87.7148,
    website: 'https://maribisofchicago.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Duly — Bridgeport',
    slug: 'duly-dispensary-bridgeport',
    address: '2710 S Halsted St',
    city: 'Chicago',
    state: 'IL',
    zip: '60608',
    lat: 41.8444, lng: -87.6472,
    licenseType: 'Adult Use',
  },
  {
    name: 'Cannabis for Healing — Chicago',
    slug: 'cannabis-for-healing-chicago',
    address: '5206 S Harper Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60615',
    lat: 41.7996, lng: -87.5886,
    licenseType: 'Adult Use',
  },
  {
    name: 'Ayr Wellness — Chicago',
    slug: 'ayr-wellness-chicago',
    address: '939 W Randolph St',
    city: 'Chicago',
    state: 'IL',
    zip: '60607',
    lat: 41.8843, lng: -87.6508,
    website: 'https://ayrwellness.com',
    licenseType: 'Adult Use',
  },

  // ── Chicagoland Suburbs ────────────────────────────────────────────────────
  {
    name: 'Windy City Cannabis — Homewood',
    slug: 'windy-city-cannabis-homewood',
    address: '18380 Dixie Hwy',
    city: 'Homewood',
    state: 'IL',
    zip: '60430',
    lat: 41.5612, lng: -87.6729,
    website: 'https://windycitycannabis.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Windy City Cannabis — Posen',
    slug: 'windy-city-cannabis-posen',
    address: '2724 Plum Creek Rd',
    city: 'Posen',
    state: 'IL',
    zip: '60469',
    lat: 41.6274, lng: -87.6860,
    website: 'https://windycitycannabis.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Windy City Cannabis — Willowbrook',
    slug: 'windy-city-cannabis-willowbrook',
    address: '7220 Kingery Hwy',
    city: 'Willowbrook',
    state: 'IL',
    zip: '60527',
    lat: 41.7679, lng: -87.9476,
    website: 'https://windycitycannabis.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Nature\'s Care — Rolling Meadows',
    slug: 'natures-care-rolling-meadows',
    address: '3830 Algonquin Rd',
    city: 'Rolling Meadows',
    state: 'IL',
    zip: '60008',
    lat: 42.0750, lng: -88.0244,
    website: 'https://naturescare.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Elmwood Park',
    slug: 'sunnyside-elmwood-park',
    address: '7226 W North Ave',
    city: 'Elmwood Park',
    state: 'IL',
    zip: '60707',
    lat: 41.9200, lng: -87.8131,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Elmhurst',
    slug: 'sunnyside-elmhurst',
    address: '245 E Lake St',
    city: 'Elmhurst',
    state: 'IL',
    zip: '60126',
    lat: 41.8981, lng: -87.9401,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Green Rose — Elgin',
    slug: 'green-rose-elgin',
    address: '1321 Larkin Ave',
    city: 'Elgin',
    state: 'IL',
    zip: '60123',
    lat: 42.0367, lng: -88.3067,
    licenseType: 'Adult Use',
  },
  {
    name: 'Zen Leaf — Mundelein',
    slug: 'zen-leaf-mundelein',
    address: '1321 N Lake St',
    city: 'Mundelein',
    state: 'IL',
    zip: '60060',
    lat: 42.2736, lng: -88.0059,
    website: 'https://zenleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Newtown (Joliet)',
    slug: 'curaleaf-joliet',
    address: '2350 W Jefferson St',
    city: 'Joliet',
    state: 'IL',
    zip: '60435',
    lat: 41.5219, lng: -88.1278,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Verilife — Romeoville',
    slug: 'verilife-romeoville',
    address: '100 Enchanted Pkwy',
    city: 'Romeoville',
    state: 'IL',
    zip: '60446',
    lat: 41.6473, lng: -88.0900,
    website: 'https://verilife.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Aurora',
    slug: 'sunnyside-aurora',
    address: '220 S Farnsworth Ave',
    city: 'Aurora',
    state: 'IL',
    zip: '60505',
    lat: 41.7530, lng: -88.2867,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Ascend Wellness — Collinsville',
    slug: 'ascend-wellness-collinsville',
    address: '901 Bluff Rd',
    city: 'Collinsville',
    state: 'IL',
    zip: '62234',
    lat: 38.6795, lng: -89.9996,
    website: 'https://awholdings.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'GTI / Revel — Mundelein',
    slug: 'revel-cannabis-mundelein',
    address: '21295 W Boxwood Dr',
    city: 'Mundelein',
    state: 'IL',
    zip: '60060',
    lat: 42.2615, lng: -88.0185,
    website: 'https://gtigrows.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'GTI / Revel — Joliet',
    slug: 'revel-cannabis-joliet',
    address: '2900 Plainfield Rd',
    city: 'Joliet',
    state: 'IL',
    zip: '60435',
    lat: 41.5280, lng: -88.1437,
    website: 'https://gtigrows.com',
    licenseType: 'Adult Use',
  },

  // ── Rockford / Northern Illinois ──────────────────────────────────────────
  {
    name: 'Sunnyside — Rockford',
    slug: 'sunnyside-rockford',
    address: '3625 N Perryville Rd',
    city: 'Rockford',
    state: 'IL',
    zip: '61114',
    lat: 42.3194, lng: -88.9956,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Rockford',
    slug: 'curaleaf-rockford',
    address: '4800 E State St',
    city: 'Rockford',
    state: 'IL',
    zip: '61108',
    lat: 42.2613, lng: -88.9817,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Zen Leaf — Waukegan',
    slug: 'zen-leaf-waukegan',
    address: '1330 Golf Rd',
    city: 'Waukegan',
    state: 'IL',
    zip: '60087',
    lat: 42.3690, lng: -87.8908,
    website: 'https://zenleaf.com',
    licenseType: 'Adult Use',
  },

  // ── Central Illinois ──────────────────────────────────────────────────────
  {
    name: 'Sunnyside — Champaign',
    slug: 'sunnyside-champaign',
    address: '301 N Neil St',
    city: 'Champaign',
    state: 'IL',
    zip: '61820',
    lat: 40.1162, lng: -88.2427,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Maribis — Champaign',
    slug: 'maribis-champaign',
    address: '202 W Anthony Dr',
    city: 'Champaign',
    state: 'IL',
    zip: '61822',
    lat: 40.1247, lng: -88.2819,
    website: 'https://maribisofchicago.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Verilife — Normal',
    slug: 'verilife-normal',
    address: '2302 E College Ave',
    city: 'Normal',
    state: 'IL',
    zip: '61761',
    lat: 40.5061, lng: -88.9574,
    website: 'https://verilife.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Normal',
    slug: 'sunnyside-normal',
    address: '2109 E College Ave',
    city: 'Normal',
    state: 'IL',
    zip: '61761',
    lat: 40.5064, lng: -88.9626,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Joliet (Rt 30)',
    slug: 'curaleaf-joliet-rt30',
    address: '1000 W Lincoln Hwy',
    city: 'Joliet',
    state: 'IL',
    zip: '60433',
    lat: 41.5102, lng: -88.0934,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },

  // ── Springfield / Central-West ────────────────────────────────────────────
  {
    name: 'Maribis — Springfield',
    slug: 'maribis-springfield',
    address: '1430 Wabash Ave',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    lat: 39.7799, lng: -89.6681,
    website: 'https://maribisofchicago.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Springfield',
    slug: 'curaleaf-springfield',
    address: '2501 E Cook St',
    city: 'Springfield',
    state: 'IL',
    zip: '62703',
    lat: 39.8009, lng: -89.6259,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'The Dispensary — Decatur',
    slug: 'the-dispensary-decatur',
    address: '2740 N Woodford St',
    city: 'Decatur',
    state: 'IL',
    zip: '62526',
    lat: 39.8713, lng: -88.9473,
    licenseType: 'Adult Use',
  },

  // ── Southern Illinois ─────────────────────────────────────────────────────
  {
    name: 'Ascend Wellness — Fairview Heights',
    slug: 'ascend-wellness-fairview-heights',
    address: '10 Commerce Dr',
    city: 'Fairview Heights',
    state: 'IL',
    zip: '62208',
    lat: 38.5985, lng: -89.9996,
    website: 'https://awholdings.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Zen Leaf — Maryville',
    slug: 'zen-leaf-maryville',
    address: '6900 Center Grove Rd',
    city: 'Maryville',
    state: 'IL',
    zip: '62062',
    lat: 38.7247, lng: -89.9561,
    website: 'https://zenleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Verilife — Peoria',
    slug: 'verilife-peoria',
    address: '4426 N Brandywine Dr',
    city: 'Peoria',
    state: 'IL',
    zip: '61614',
    lat: 40.7490, lng: -89.5905,
    website: 'https://verilife.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Deerfield',
    slug: 'curaleaf-deerfield',
    address: '700 Waukegan Rd',
    city: 'Deerfield',
    state: 'IL',
    zip: '60015',
    lat: 42.1711, lng: -87.8483,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Verilife — Bloomington',
    slug: 'verilife-bloomington',
    address: '1600 Empire St',
    city: 'Bloomington',
    state: 'IL',
    zip: '61701',
    lat: 40.4659, lng: -88.9819,
    website: 'https://verilife.com',
    licenseType: 'Adult Use',
  },

  // ── Chicago neighborhoods expanded ────────────────────────────────────────
  {
    name: 'Dispensary 33 — Pilsen',
    slug: 'dispensary-33-pilsen',
    address: '2130 S Halsted St',
    city: 'Chicago',
    state: 'IL',
    zip: '60608',
    lat: 41.8529, lng: -87.6475,
    website: 'https://dispensary33.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Revolution Cannabis — Chicago',
    slug: 'revolution-cannabis-chicago',
    address: '1160 N Milwaukee Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60622',
    lat: 41.9035, lng: -87.6618,
    website: 'https://revcannabis.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Maribis — West Loop',
    slug: 'maribis-west-loop',
    address: '820 W Lake St',
    city: 'Chicago',
    state: 'IL',
    zip: '60607',
    lat: 41.8854, lng: -87.6481,
    website: 'https://maribisofchicago.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — South Loop',
    slug: 'sunnyside-south-loop',
    address: '1 S Dearborn St',
    city: 'Chicago',
    state: 'IL',
    zip: '60603',
    lat: 41.8822, lng: -87.6284,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Ivy Hall — Hyde Park',
    slug: 'ivy-hall-hyde-park',
    address: '1301 E 53rd St',
    city: 'Chicago',
    state: 'IL',
    zip: '60615',
    lat: 41.7994, lng: -87.5929,
    website: 'https://ivyhall.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Zen Leaf — Lakeview',
    slug: 'zen-leaf-lakeview',
    address: '3454 N Southport Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60657',
    lat: 41.9434, lng: -87.6636,
    website: 'https://zenleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Pilsen',
    slug: 'curaleaf-pilsen',
    address: '1435 W 18th St',
    city: 'Chicago',
    state: 'IL',
    zip: '60608',
    lat: 41.8574, lng: -87.6647,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Ascend Wellness — Wicker Park',
    slug: 'ascend-wellness-wicker-park',
    address: '1340 N Western Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60622',
    lat: 41.9073, lng: -87.6877,
    website: 'https://awholdings.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Revolution Cannabis — Logan Square',
    slug: 'revolution-cannabis-logan-square',
    address: '2655 N Milwaukee Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60647',
    lat: 41.9309, lng: -87.7007,
    website: 'https://revcannabis.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Nature\'s Care — Lincoln Square',
    slug: 'natures-care-lincoln-square',
    address: '4936 N Western Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60625',
    lat: 41.9691, lng: -87.6882,
    website: 'https://naturescare.com',
    licenseType: 'Adult Use',
  },

  // ── North Shore / Lake County ─────────────────────────────────────────────
  {
    name: 'Zen Leaf — Evanston',
    slug: 'zen-leaf-evanston',
    address: '1804 Maple Ave',
    city: 'Evanston',
    state: 'IL',
    zip: '60201',
    lat: 42.0528, lng: -87.6914,
    website: 'https://zenleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Schaumburg',
    slug: 'sunnyside-schaumburg',
    address: '1490 McConnor Pkwy',
    city: 'Schaumburg',
    state: 'IL',
    zip: '60173',
    lat: 42.0434, lng: -88.0340,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Danville',
    slug: 'curaleaf-danville',
    address: '800 N Vermilion St',
    city: 'Danville',
    state: 'IL',
    zip: '61832',
    lat: 40.1286, lng: -87.6322,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Revolution Cannabis — Sunrise',
    slug: 'revolution-cannabis-sunrise',
    address: '4870 American Way',
    city: 'Marion',
    state: 'IL',
    zip: '62959',
    lat: 37.7306, lng: -88.9340,
    website: 'https://revcannabis.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Curaleaf — Galesburg',
    slug: 'curaleaf-galesburg',
    address: '2390 N Henderson St',
    city: 'Galesburg',
    state: 'IL',
    zip: '61401',
    lat: 40.9627, lng: -90.3680,
    website: 'https://curaleaf.com',
    licenseType: 'Adult Use',
  },

  // ── DuPage / Kane / Will County ───────────────────────────────────────────
  {
    name: 'Verilife — Addison',
    slug: 'verilife-addison',
    address: '750 W Lake St',
    city: 'Addison',
    state: 'IL',
    zip: '60101',
    lat: 41.9362, lng: -87.9801,
    website: 'https://verilife.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Sunnyside — Naperville',
    slug: 'sunnyside-naperville',
    address: '1550 N Naper Blvd',
    city: 'Naperville',
    state: 'IL',
    zip: '60563',
    lat: 41.8194, lng: -88.1611,
    website: 'https://sunnyside.shop',
    licenseType: 'Adult Use',
  },
  {
    name: 'Zen Leaf — Aurora',
    slug: 'zen-leaf-aurora',
    address: '400 W Galena Blvd',
    city: 'Aurora',
    state: 'IL',
    zip: '60506',
    lat: 41.7611, lng: -88.3159,
    website: 'https://zenleaf.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Revolution Cannabis — Moline',
    slug: 'revolution-cannabis-moline',
    address: '4600 27th St',
    city: 'Moline',
    state: 'IL',
    zip: '61265',
    lat: 41.4960, lng: -90.5257,
    website: 'https://revcannabis.com',
    licenseType: 'Adult Use',
  },
  {
    name: 'Windy City Cannabis — Romeoville',
    slug: 'windy-city-cannabis-romeoville',
    address: '505 W Weber Rd',
    city: 'Romeoville',
    state: 'IL',
    zip: '60446',
    lat: 41.6524, lng: -88.0852,
    website: 'https://windycitycannabis.com',
    licenseType: 'Adult Use',
  },
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seed() {
  console.log(`\n🌿 BakedBot Illinois Dispensary Seed`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Update existing: ${UPDATE_EXISTING}`);
  console.log(`   Seeding ${IL_DISPENSARIES.length} dispensaries...\n`);

  const col = db.collection('retailers');
  const crmCol = db.collection('crm_dispensaries');
  const now = Date.now();
  let created = 0, skipped = 0, updated = 0, crmCreated = 0;

  for (const d of IL_DISPENSARIES) {
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
        licenseType: d.licenseType || 'Adult Use',
        type: 'dispensary', status: 'active',
        source: 'il-idfpr-seed',
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
  console.log(`\nNext: node scripts/fetch-dispensary-logos.mjs --state=IL --dry-run\n`);
}

try {
  await seed();
} catch (e) {
  console.error('\n❌ Fatal:', e);
  process.exit(1);
}
