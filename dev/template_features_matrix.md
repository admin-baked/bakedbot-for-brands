# Competitor Template Features Matrix

| Feature | Weedmaps (City) | Weedmaps (Disp) | Leafly (City) | Leafly (Disp) | Dutchie (Menu) | Jane (Menu) | **BakedBot Target** |
|---------|-----------------|-----------------|---------------|---------------|----------------|-------------|---------------------|
| **Meta/Title Pattern** | `Dispensaries in {City}, {State}` | `{Name} - {City}` | `Dispensaries in {City}` | `{Name} Dispensary` | `{Name} | Menu` | `{Name} | {City} | Menu & Deals` |
| **URL Structure** | `/dispensaries/in/{state}/{city}` | `/dispensaries/{slug}` | `/dispensaries/{state}/{city}` | `/dispensary-info/{slug}` | `/dispensary/{slug}` | `/retail/{slug}` | `/dispensaries/{slug}` |
| **H1 Tag** | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | `{Name} - {City}` |
| **Internal Links** | Nearby Cities | Nearby Brands | Strains, Cities | Strains | Products | Products | **Nearby ZIPs, Top Brands, City Hub** |
| **UGC/Reviews** | ✅ Ratings | ✅ Reviews | ✅ Reviews | ✅ Reviews | ❌ | ✅ | **✅ Reviews (Aggregated)** |
| **Schema Type** | `ItemPoint` | `Dispensary` | `WebPage` | `Store` | `Store` | `Store` | **`CannabisDispensary` / `Product`** |
| **Freshness Signal** | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Live | ✅ Live | **✅ Last Updated Timestamp** |
| **CTA Primary** | Order Online | Order | Order | Order | Order | Shop | **Claim This Page (B2B) / Order (B2C)** |
| **Iframe Usage** | No | No | No | No | Yes | Yes | **NO (100% Native)** |
