
// src/app/api/dev/seed-cannmenus-stub/route.ts

import { NextRequest, NextResponse } from "next/server";
import { BrandDoc, ProductDoc, RetailerDoc } from "@/types/cannmenus";

// NOTE: This assumes you have a Firebase Admin helper.
// You may need to tweak these imports to match your project’s server-client.ts.
import { createServerClient } from "@/firebase/server-client";
import { getFirestore } from "firebase-admin/firestore";


// ---- Stub data (mirror what we used in the API routes) ----

const stubBrands: BrandDoc[] = [
  {
    id: "jeeter-demo",
    slug: "jeeter",
    name: "Jeeter",
    description: "Iconic infused pre-rolls and other cannabis products.",
    logoUrl:
      "https://images.unsplash.com/photo-1513639725746-c5d3e861f32a?auto=format&fit=crop&w=400&q=80",
    heroImageUrl:
      "https://images.unsplash.com/photo-1617787456475-29f32f7b54f8?auto=format&fit=crop&w=1200&q=80",
    categories: ["Pre-rolls", "Vapes"],
    website: "https://jeeter.com",
    socials: {
      instagram: "https://instagram.com/jeeter",
    },
    markets: ["CA", "MI", "AZ"],
  },
  {
    id: "stiiizy-demo",
    slug: "stiiizy",
    name: "STIIIZY",
    description: "Pods, flower, and more from STIIIZY.",
    logoUrl:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80",
    heroImageUrl:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
    categories: ["Vapes", "Flower"],
    website: "https://stiiizy.com",
    socials: {
      instagram: "https://instagram.com/stiiizy",
    },
    markets: ["CA", "NV"],
  },
];

const stubRetailers: RetailerDoc[] = [
  {
    id: "retailer-chi-001",
    name: "Green Planet Dispensary",
    slug: "green-planet-dispensary",
    street_address: "420 W Cloud St",
    city: "Chicago",
    state: "IL",
    postal_code: "60601",
    country: "US",
    geo: {
      lat: 41.8853,
      lng: -87.6216,
    },
    phone: "(312) 555-0111",
    homepage_url: "https://greenplanet.example.com",
    carriesBrands: ["jeeter-demo", "stiiizy-demo"],
    menu_url: null,
    menu_discovery_status: 'pending',
  },
  {
    id: "retailer-det-001",
    name: "Motor City Remedies",
    slug: "motor-city-remedies",
    street_address: "313 Gratiot Ave",
    city: "Detroit",
    state: "MI",
    postal_code: "48226",
    country: "US",
    geo: {
      lat: 42.3347,
      lng: -83.0469,
    },
    phone: "(313) 555-0199",
    homepage_url: "https://motorcityremedies.example.com",
    carriesBrands: ["jeeter-demo"],
    menu_url: null,
    menu_discovery_status: 'pending',
  },
];

const stubProducts: ProductDoc[] = [
  {
    id: "jeeter-gelato-1g-preroll",
    brand_id: "jeeter-demo",
    brandId: "jeeter-demo",
    name: "Jeeter Gelato Infused Pre-roll 1g",
    category: "Pre-rolls",
    strainType: "Hybrid",
    thcPercent: 31.2,
    cbdPercent: 0.1,
    size: "1g",
    imageUrl:
      "https://images.unsplash.com/photo-1513639725746-c5d3e861f32a?auto=format&fit=crop&w=600&q=80",
    tags: ["infused", "potent"],
    retailerIds: ["retailer-chi-001", "retailer-det-001"],
    sku_id: 'jeeter-gelato-1g-preroll',
    canonical_name: "Jeeter Gelato Infused Pre-roll 1g",
  },
  {
    id: "jeeter-strawberry-shortcake-5pk",
    brand_id: "jeeter-demo",
    brandId: "jeeter-demo",
    name: "Jeeter Strawberry Shortcake Infused 5-Pack",
    category: "Pre-rolls",
    strainType: "Hybrid",
    thcPercent: 32.5,
    cbdPercent: 0.1,
    size: "5 x 0.5g",
    imageUrl:
      "https://images.unsplash.com/photo-1545243424-0ce743321e11?auto=format&fit=crop&w=600&q=80",
    tags: ["infused", "5-pack"],
    retailerIds: ["retailer-chi-001"],
    sku_id: 'jeeter-strawberry-shortcake-5pk',
    canonical_name: 'Jeeter Strawberry Shortcake Infused 5-Pack',
  },
  {
    id: "stiiizy-king-louis-pod-1g",
    brand_id: "stiiizy-demo",
    brandId: "stiiizy-demo",
    name: "STIIIZY King Louis XIII Pod 1g",
    category: "Vapes",
    strainType: "Indica",
    thcPercent: 85.0,
    cbdPercent: 0.0,
    size: "1g",
    imageUrl:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80",
    tags: ["pod", "indica"],
    retailerIds: ["retailer-chi-001"],
    sku_id: 'stiiizy-king-louis-pod-1g',
    canonical_name: 'STIIIZY King Louis XIII Pod 1g',
  },
  {
    id: "stiiizy-og-kush-flower-3.5",
    brand_id: "stiiizy-demo",
    brandId: "stiiizy-demo",
    name: "STIIIZY OG Kush Flower 3.5g",
    category: "Flower",
    strainType: "Hybrid",
    thcPercent: 27.0,
    cbdPercent: 0.1,
    size: "3.5g",
    imageUrl:
      "https://images.unsplash.com/photo-1511715282680-fbf93a50e721?auto=format&fit=crop&w=600&q=80",
    tags: ["eighth", "hybrid"],
    retailerIds: ["retailer-chi-001", "retailer-det-001"],
    sku_id: 'stiiizy-og-kush-flower-3.5',
    canonical_name: 'STIIIZY OG Kush Flower 3.5g',
  },
];

// ---- Route ----

// I’m making this POST-only so you don’t accidentally seed on page load.
export async function POST(_req: NextRequest) {
  try {
    const { firestore } = await createServerClient();
    const now = new Date();

    const brandCol = firestore.collection("cannmenus_brands");
    const productCol = firestore.collection("cannmenus_products");
    const retailerCol = firestore.collection("cannmenus_retailers");

    const batch = firestore.batch();

    for (const b of stubBrands) {
      const ref = brandCol.doc(b.id);
      batch.set(
        ref,
        {
          ...b,
          createdAt: b.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    for (const p of stubProducts) {
      const ref = productCol.doc(p.id);
      batch.set(
        ref,
        {
          ...p,
          createdAt: p.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    for (const r of stubRetailers) {
      const ref = retailerCol.doc(r.id);
      batch.set(
        ref,
        {
          ...r,
          createdAt: r.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();

    return NextResponse.json(
      {
        ok: true,
        seeded: {
          brands: stubBrands.length,
          products: stubProducts.length,
          retailers: stubRetailers.length,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error seeding CannMenus stub:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error seeding CannMenus stub",
      },
      { status: 500 }
    );
  }
}
