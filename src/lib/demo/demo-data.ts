
import type { Product, Retailer, Review, UserInteraction, OrderDoc, Location } from '@/types/domain';
import { PlaceHolderImages } from '@/lib/placeholder-images';


// This is now exported so the chatbot can use it as a fallback.
// Using cloud storage assets
export const defaultChatbotIcon = 'https://storage.googleapis.com/bakedbot-global-assets/SMokey-Chat-scaled.png';

// Also exporting defaultLogo from here for consistency in demo setup.
export const defaultLogo = 'https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';


export const demoProducts: Product[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // FLOWER (6 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-gg4',
    name: '40 Tons Gorilla Glue #4',
    category: 'Flower',
    price: 45.00,
    prices: { 'bayside-cannabis': 45.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product4')?.imageUrl || '',
    imageHint: 'cannabis flower',
    description: 'A potent hybrid strain that delivers heavy-handed euphoria and relaxation, leaving you feeling "glued" to the couch. 3.5g eighth.',
    likes: 420,
    dislikes: 15,
    brandId: 'default',
    thcPercent: 28.5,
    cbdPercent: 0.1,
    strainType: 'Hybrid',
    terpenes: [
      { name: 'Caryophyllene', percent: 1.2 },
      { name: 'Limonene', percent: 0.8 },
      { name: 'Myrcene', percent: 0.6 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 28.5 },
      { name: 'CBD', percent: 0.1 },
      { name: 'CBG', percent: 0.3 }
    ],
    effects: ['Relaxed', 'Euphoric', 'Happy', 'Sleepy'],
  },
  {
    id: 'demo-40t-sour-diesel',
    name: '40 Tons Sour Diesel',
    category: 'Flower',
    price: 48.00,
    prices: { 'bayside-cannabis': 48.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'cannabis nug',
    description: 'An invigorating sativa-dominant strain named after its pungent, diesel-like aroma. Delivers energizing, dreamy cerebral effects. 3.5g eighth.',
    likes: 485,
    dislikes: 11,
    brandId: 'default',
    thcPercent: 26.0,
    cbdPercent: 0.2,
    strainType: 'Sativa',
    terpenes: [
      { name: 'Caryophyllene', percent: 0.9 },
      { name: 'Limonene', percent: 1.1 },
      { name: 'Myrcene', percent: 0.5 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 26.0 },
      { name: 'CBD', percent: 0.2 }
    ],
    effects: ['Energetic', 'Creative', 'Focused', 'Uplifted'],
  },
  {
    id: 'demo-40t-blue-dream',
    name: '40 Tons Blue Dream',
    category: 'Flower',
    price: 42.00,
    prices: { 'bayside-cannabis': 42.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product6')?.imageUrl || '',
    imageHint: 'cannabis flower',
    description: 'A legendary sativa-dominant hybrid originating in California. Balances full-body relaxation with gentle cerebral invigoration. 3.5g eighth.',
    likes: 512,
    dislikes: 9,
    brandId: 'default',
    thcPercent: 24.0,
    cbdPercent: 0.1,
    strainType: 'Sativa-Hybrid',
    terpenes: [
      { name: 'Myrcene', percent: 1.0 },
      { name: 'Pinene', percent: 0.7 },
      { name: 'Caryophyllene', percent: 0.5 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 24.0 },
      { name: 'CBD', percent: 0.1 }
    ],
    effects: ['Relaxed', 'Happy', 'Creative', 'Uplifted'],
  },
  {
    id: 'demo-40t-purple-punch',
    name: '40 Tons Purple Punch',
    category: 'Flower',
    price: 50.00,
    prices: { 'bayside-cannabis': 50.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product4')?.imageUrl || '',
    imageHint: 'cannabis flower',
    description: 'A sweet, grape-forward indica cross of Larry OG and Granddaddy Purple. Perfect for evening relaxation. 3.5g eighth.',
    likes: 392,
    dislikes: 7,
    brandId: 'default',
    thcPercent: 25.0,
    cbdPercent: 0.1,
    strainType: 'Indica',
    terpenes: [
      { name: 'Limonene', percent: 0.9 },
      { name: 'Caryophyllene', percent: 0.7 },
      { name: 'Linalool', percent: 0.4 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 25.0 },
      { name: 'CBD', percent: 0.1 }
    ],
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Hungry'],
  },
  {
    id: 'demo-40t-wedding-cake',
    name: '40 Tons Wedding Cake',
    category: 'Flower',
    price: 55.00,
    prices: { 'bayside-cannabis': 55.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'cannabis nug',
    description: 'A rich, tangy hybrid with earthy pepper undertones. Known for relaxing effects that calm body and mind. Premium top-shelf. 3.5g eighth.',
    likes: 628,
    dislikes: 12,
    brandId: 'default',
    thcPercent: 29.0,
    cbdPercent: 0.1,
    strainType: 'Hybrid',
    terpenes: [
      { name: 'Limonene', percent: 1.3 },
      { name: 'Caryophyllene', percent: 1.0 },
      { name: 'Linalool', percent: 0.3 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 29.0 },
      { name: 'CBD', percent: 0.1 },
      { name: 'CBG', percent: 0.4 }
    ],
    effects: ['Relaxed', 'Euphoric', 'Happy', 'Creative'],
  },
  {
    id: 'demo-40t-cbd-remedy',
    name: '40 Tons CBD Remedy',
    category: 'Flower',
    price: 35.00,
    prices: { 'bayside-cannabis': 35.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product6')?.imageUrl || '',
    imageHint: 'cannabis flower',
    description: 'High-CBD, low-THC flower for those seeking therapeutic benefits without intense psychoactive effects. Great for daytime use. 3.5g eighth.',
    likes: 245,
    dislikes: 4,
    brandId: 'default',
    thcPercent: 1.5,
    cbdPercent: 18.0,
    strainType: 'CBD',
    terpenes: [
      { name: 'Myrcene', percent: 0.8 },
      { name: 'Pinene', percent: 0.6 },
      { name: 'Caryophyllene', percent: 0.4 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 1.5 },
      { name: 'CBD', percent: 18.0 },
      { name: 'CBG', percent: 0.5 }
    ],
    effects: ['Calm', 'Clear-headed', 'Relaxed', 'Focused'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-ROLLS (4 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-og-preroll',
    name: '40 Tons OG Kush Pre-roll',
    category: 'Pre-roll',
    price: 12.00,
    prices: { 'bayside-cannabis': 12.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product1')?.imageUrl || '',
    imageHint: 'cannabis preroll',
    description: 'A classic strain known for its stress-relieving effects, now in a convenient 1g pre-roll. Ready to spark.',
    likes: 380,
    dislikes: 8,
    brandId: 'default',
    thcPercent: 22.0,
    cbdPercent: 0.1,
    strainType: 'Indica-Hybrid',
    terpenes: [
      { name: 'Myrcene', percent: 0.9 },
      { name: 'Limonene', percent: 0.6 },
      { name: 'Caryophyllene', percent: 0.5 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 22.0 },
      { name: 'CBD', percent: 0.1 }
    ],
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Uplifted'],
  },
  {
    id: 'demo-40t-infused-preroll',
    name: '40 Tons Diamond Infused Pre-roll',
    category: 'Pre-roll',
    price: 25.00,
    prices: { 'bayside-cannabis': 25.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product1')?.imageUrl || '',
    imageHint: 'cannabis preroll',
    description: 'Premium flower rolled with live resin and coated in THCa diamonds. 1g of pure potency for experienced consumers.',
    likes: 445,
    dislikes: 6,
    brandId: 'default',
    thcPercent: 45.0,
    cbdPercent: 0.1,
    strainType: 'Hybrid',
    terpenes: [
      { name: 'Limonene', percent: 1.5 },
      { name: 'Caryophyllene', percent: 1.2 },
      { name: 'Myrcene', percent: 0.8 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 45.0 },
      { name: 'THCa', percent: 8.0 },
      { name: 'CBD', percent: 0.1 }
    ],
    effects: ['Euphoric', 'Relaxed', 'Creative', 'Happy'],
  },
  {
    id: 'demo-40t-preroll-pack',
    name: '40 Tons Variety Pre-roll Pack',
    category: 'Pre-roll',
    price: 35.00,
    prices: { 'bayside-cannabis': 35.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product1')?.imageUrl || '',
    imageHint: 'cannabis preroll pack',
    description: '5-pack of 0.5g pre-rolls featuring our top strains: GG4, Sour Diesel, Blue Dream, Purple Punch, and Wedding Cake.',
    likes: 310,
    dislikes: 5,
    brandId: 'default',
    thcPercent: 24.0,
    cbdPercent: 0.1,
    strainType: 'Mixed',
    effects: ['Variety', 'Social', 'Shareable'],
  },
  {
    id: 'demo-40t-cbd-preroll',
    name: '40 Tons CBD Pre-roll',
    category: 'Pre-roll',
    price: 10.00,
    prices: { 'bayside-cannabis': 10.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product1')?.imageUrl || '',
    imageHint: 'cbd preroll',
    description: 'High-CBD, low-THC 1g pre-roll for relaxation without the high. Perfect for unwinding anytime.',
    likes: 198,
    dislikes: 3,
    brandId: 'default',
    thcPercent: 1.0,
    cbdPercent: 15.0,
    strainType: 'CBD',
    cannabinoids: [
      { name: 'THC', percent: 1.0 },
      { name: 'CBD', percent: 15.0 }
    ],
    effects: ['Calm', 'Clear-headed', 'Relaxed'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VAPES (5 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-runtz-vape',
    name: '40 Tons Runtz Vape Cart',
    category: 'Vapes',
    price: 45.00,
    prices: { 'bayside-cannabis': 45.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product9')?.imageUrl || '',
    imageHint: 'vape cartridge',
    description: '1g vape cartridge filled with premium Runtz live resin. Fruity flavor profile and long-lasting euphoric high.',
    likes: 550,
    dislikes: 5,
    brandId: 'default',
    thcPercent: 85.0,
    cbdPercent: 0.5,
    strainType: 'Hybrid',
    terpenes: [
      { name: 'Limonene', percent: 3.2 },
      { name: 'Caryophyllene', percent: 2.1 },
      { name: 'Linalool', percent: 1.5 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 85.0 },
      { name: 'CBD', percent: 0.5 }
    ],
    effects: ['Euphoric', 'Happy', 'Relaxed', 'Creative'],
  },
  {
    id: 'demo-40t-live-rosin-vape',
    name: '40 Tons Live Rosin Cart',
    category: 'Vapes',
    price: 60.00,
    prices: { 'bayside-cannabis': 60.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product9')?.imageUrl || '',
    imageHint: 'vape cartridge',
    description: 'Solventless live rosin in a 0.5g cartridge. Full-spectrum terpene profile for the ultimate connoisseur experience.',
    likes: 412,
    dislikes: 3,
    brandId: 'default',
    thcPercent: 78.0,
    cbdPercent: 1.0,
    strainType: 'Indica',
    terpenes: [
      { name: 'Myrcene', percent: 4.5 },
      { name: 'Limonene', percent: 2.8 },
      { name: 'Caryophyllene', percent: 2.0 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 78.0 },
      { name: 'CBD', percent: 1.0 },
      { name: 'CBN', percent: 0.5 }
    ],
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Calm'],
  },
  {
    id: 'demo-40t-disposable-vape',
    name: '40 Tons All-in-One Disposable',
    category: 'Vapes',
    price: 30.00,
    prices: { 'bayside-cannabis': 30.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product7')?.imageUrl || '',
    imageHint: 'disposable vape',
    description: '0.5g rechargeable disposable vape. No charging or setup needed. Gelato strain with dessert-like flavor.',
    likes: 325,
    dislikes: 8,
    brandId: 'default',
    thcPercent: 80.0,
    cbdPercent: 0.3,
    strainType: 'Hybrid',
    terpenes: [
      { name: 'Limonene', percent: 2.5 },
      { name: 'Caryophyllene', percent: 1.8 },
      { name: 'Linalool', percent: 1.2 }
    ],
    effects: ['Relaxed', 'Euphoric', 'Uplifted'],
  },
  {
    id: 'demo-40t-cbd-vape',
    name: '40 Tons CBD Vape Cart',
    category: 'Vapes',
    price: 35.00,
    prices: { 'bayside-cannabis': 35.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product9')?.imageUrl || '',
    imageHint: 'cbd vape cartridge',
    description: '1g CBD-dominant vape cart with trace THC. Smooth, calming effects without intense psychoactivity.',
    likes: 215,
    dislikes: 4,
    brandId: 'default',
    thcPercent: 2.0,
    cbdPercent: 65.0,
    strainType: 'CBD',
    cannabinoids: [
      { name: 'THC', percent: 2.0 },
      { name: 'CBD', percent: 65.0 },
      { name: 'CBG', percent: 3.0 }
    ],
    effects: ['Calm', 'Clear-headed', 'Relaxed', 'Focused'],
  },
  {
    id: 'demo-40t-pod-vape',
    name: '40 Tons Pax Pod - Jack Herer',
    category: 'Vapes',
    price: 55.00,
    prices: { 'bayside-cannabis': 55.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product8')?.imageUrl || '',
    imageHint: 'pax pod',
    description: '0.5g Pax Era compatible pod with Jack Herer distillate. Energizing sativa for daytime productivity.',
    likes: 289,
    dislikes: 6,
    brandId: 'default',
    thcPercent: 88.0,
    cbdPercent: 0.2,
    strainType: 'Sativa',
    terpenes: [
      { name: 'Terpinolene', percent: 3.0 },
      { name: 'Pinene', percent: 2.2 },
      { name: 'Caryophyllene', percent: 1.5 }
    ],
    effects: ['Energetic', 'Creative', 'Focused', 'Uplifted'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIBLES (6 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-cookies',
    name: '40 Tons Chocolate Chip Cookies',
    category: 'Edibles',
    price: 25.00,
    prices: { 'bayside-cannabis': 25.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || '',
    imageHint: 'cannabis cookies',
    description: 'Deliciously baked chocolate chip cookies. 100mg total (10mg per cookie, 10-pack). Full-spectrum cannabis extract.',
    likes: 210,
    dislikes: 3,
    brandId: 'default',
    thcPercent: 10.0,
    cbdPercent: 0.0,
    strainType: 'Hybrid',
    effects: ['Relaxed', 'Happy', 'Euphoric'],
  },
  {
    id: 'demo-40t-gummies',
    name: '40 Tons Watermelon Gummies',
    category: 'Edibles',
    price: 22.00,
    prices: { 'bayside-cannabis': 22.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product3')?.imageUrl || '',
    imageHint: 'cannabis gummies',
    description: 'Juicy watermelon flavored gummy bites. 100mg total (5mg per piece, 20-pack). Perfect for microdosing.',
    likes: 340,
    dislikes: 2,
    brandId: 'default',
    thcPercent: 5.0,
    cbdPercent: 0.0,
    strainType: 'Hybrid',
    effects: ['Happy', 'Relaxed', 'Uplifted'],
  },
  {
    id: 'demo-40t-high-dose-gummies',
    name: '40 Tons High-Dose Gummies',
    category: 'Edibles',
    price: 40.00,
    prices: { 'bayside-cannabis': 40.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product3')?.imageUrl || '',
    imageHint: 'cannabis gummies',
    description: 'For experienced consumers. 500mg total (50mg per piece, 10-pack). Mixed fruit flavors. Start low, go slow.',
    likes: 178,
    dislikes: 5,
    brandId: 'default',
    thcPercent: 50.0,
    cbdPercent: 0.0,
    strainType: 'Indica',
    effects: ['Relaxed', 'Sleepy', 'Euphoric', 'Hungry'],
  },
  {
    id: 'demo-40t-cbd-gummies',
    name: '40 Tons CBD:THC 1:1 Gummies',
    category: 'Edibles',
    price: 28.00,
    prices: { 'bayside-cannabis': 28.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product3')?.imageUrl || '',
    imageHint: 'cbd gummies',
    description: 'Balanced 1:1 ratio for therapeutic relief. 200mg total (10mg CBD + 10mg THC per piece, 10-pack). Berry flavored.',
    likes: 265,
    dislikes: 2,
    brandId: 'default',
    thcPercent: 10.0,
    cbdPercent: 10.0,
    strainType: 'Balanced',
    cannabinoids: [
      { name: 'THC', percent: 10.0 },
      { name: 'CBD', percent: 10.0 }
    ],
    effects: ['Balanced', 'Relaxed', 'Clear-headed', 'Pain Relief'],
  },
  {
    id: 'demo-40t-chocolate-bar',
    name: '40 Tons Dark Chocolate Bar',
    category: 'Edibles',
    price: 30.00,
    prices: { 'bayside-cannabis': 30.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || '',
    imageHint: 'cannabis chocolate',
    description: 'Premium 70% dark chocolate bar. 100mg total with 10 scored pieces (10mg each). Rich cocoa flavor.',
    likes: 295,
    dislikes: 4,
    brandId: 'default',
    thcPercent: 10.0,
    cbdPercent: 0.0,
    strainType: 'Hybrid',
    effects: ['Relaxed', 'Happy', 'Creative'],
  },
  {
    id: 'demo-40t-mints',
    name: '40 Tons Peppermint Mints',
    category: 'Edibles',
    price: 18.00,
    prices: { 'bayside-cannabis': 18.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || '',
    imageHint: 'cannabis mints',
    description: 'Discreet, fast-acting mints. 100mg total (2.5mg per mint, 40-pack). Fresh peppermint flavor. Sugar-free.',
    likes: 189,
    dislikes: 1,
    brandId: 'default',
    thcPercent: 2.5,
    cbdPercent: 0.0,
    strainType: 'Sativa',
    effects: ['Uplifted', 'Focused', 'Energetic'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TINCTURES (3 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-tincture',
    name: '40 Tons Sleep Tincture',
    category: 'Tinctures',
    price: 55.00,
    prices: { 'bayside-cannabis': 55.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product8')?.imageUrl || '',
    imageHint: 'cannabis tincture',
    description: 'A soothing blend of THC and CBN designed for sleep. 1000mg THC + 500mg CBN. Easy-to-dose dropper (30ml bottle).',
    likes: 180,
    dislikes: 0,
    brandId: 'default',
    thcPercent: 33.0,
    cbdPercent: 0.0,
    strainType: 'Indica',
    cannabinoids: [
      { name: 'THC', percent: 33.0 },
      { name: 'CBN', percent: 16.5 }
    ],
    effects: ['Sleepy', 'Relaxed', 'Calm'],
  },
  {
    id: 'demo-40t-daily-tincture',
    name: '40 Tons Daily Wellness Tincture',
    category: 'Tinctures',
    price: 45.00,
    prices: { 'bayside-cannabis': 45.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product8')?.imageUrl || '',
    imageHint: 'cbd tincture',
    description: 'High-CBD formula for daily wellness. 1500mg CBD + 150mg THC (10:1 ratio). MCT oil base. 30ml bottle.',
    likes: 234,
    dislikes: 2,
    brandId: 'default',
    thcPercent: 0.5,
    cbdPercent: 50.0,
    strainType: 'CBD',
    cannabinoids: [
      { name: 'CBD', percent: 50.0 },
      { name: 'THC', percent: 5.0 }
    ],
    effects: ['Calm', 'Clear-headed', 'Pain Relief', 'Anti-inflammatory'],
  },
  {
    id: 'demo-40t-energy-tincture',
    name: '40 Tons Energy Tincture',
    category: 'Tinctures',
    price: 50.00,
    prices: { 'bayside-cannabis': 50.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product8')?.imageUrl || '',
    imageHint: 'cannabis tincture',
    description: 'Sativa-forward formula with added THCV for focus and energy. 500mg THC + 100mg THCV. Citrus flavor. 30ml bottle.',
    likes: 156,
    dislikes: 3,
    brandId: 'default',
    thcPercent: 16.5,
    cbdPercent: 0.0,
    strainType: 'Sativa',
    cannabinoids: [
      { name: 'THC', percent: 16.5 },
      { name: 'THCV', percent: 3.3 }
    ],
    effects: ['Energetic', 'Focused', 'Creative', 'Appetite Suppressant'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONCENTRATES (5 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-live-resin',
    name: '40 Tons Live Resin - GMO',
    category: 'Concentrates',
    price: 45.00,
    prices: { 'bayside-cannabis': 45.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'cannabis concentrate',
    description: 'Fresh-frozen live resin with pungent garlic and diesel notes. 1g jar. High terpene content for full-spectrum effects.',
    likes: 367,
    dislikes: 4,
    brandId: 'default',
    thcPercent: 75.0,
    cbdPercent: 0.2,
    strainType: 'Indica-Hybrid',
    terpenes: [
      { name: 'Caryophyllene', percent: 4.5 },
      { name: 'Limonene', percent: 2.8 },
      { name: 'Myrcene', percent: 2.2 }
    ],
    cannabinoids: [
      { name: 'THC', percent: 75.0 },
      { name: 'CBD', percent: 0.2 }
    ],
    effects: ['Relaxed', 'Euphoric', 'Hungry', 'Sleepy'],
  },
  {
    id: 'demo-40t-shatter',
    name: '40 Tons Shatter - Lemon Haze',
    category: 'Concentrates',
    price: 35.00,
    prices: { 'bayside-cannabis': 35.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'cannabis shatter',
    description: 'Glass-like BHO shatter with bright citrus notes. 1g. Easy to handle and dose. Great for dabbing.',
    likes: 298,
    dislikes: 6,
    brandId: 'default',
    thcPercent: 82.0,
    cbdPercent: 0.1,
    strainType: 'Sativa',
    terpenes: [
      { name: 'Limonene', percent: 3.5 },
      { name: 'Terpinolene', percent: 2.0 },
      { name: 'Pinene', percent: 1.5 }
    ],
    effects: ['Energetic', 'Creative', 'Uplifted', 'Focused'],
  },
  {
    id: 'demo-40t-badder',
    name: '40 Tons Badder - Ice Cream Cake',
    category: 'Concentrates',
    price: 50.00,
    prices: { 'bayside-cannabis': 50.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'cannabis badder',
    description: 'Creamy, whipped texture badder with sweet vanilla and dough notes. 1g jar. Perfect consistency for dabbing.',
    likes: 412,
    dislikes: 3,
    brandId: 'default',
    thcPercent: 78.0,
    cbdPercent: 0.1,
    strainType: 'Indica',
    terpenes: [
      { name: 'Limonene', percent: 2.8 },
      { name: 'Caryophyllene', percent: 2.2 },
      { name: 'Linalool', percent: 1.8 }
    ],
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric'],
  },
  {
    id: 'demo-40t-diamonds',
    name: '40 Tons THCa Diamonds',
    category: 'Concentrates',
    price: 65.00,
    prices: { 'bayside-cannabis': 65.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'thca diamonds',
    description: 'Pure crystalline THCa diamonds with terp sauce. 1g. The pinnacle of potency and purity. For experienced users.',
    likes: 521,
    dislikes: 5,
    brandId: 'default',
    thcPercent: 95.0,
    cbdPercent: 0.0,
    strainType: 'Hybrid',
    cannabinoids: [
      { name: 'THCa', percent: 95.0 },
      { name: 'THC', percent: 2.0 }
    ],
    effects: ['Euphoric', 'Relaxed', 'Happy', 'Creative'],
  },
  {
    id: 'demo-40t-rosin',
    name: '40 Tons Hash Rosin - Papaya',
    category: 'Concentrates',
    price: 70.00,
    prices: { 'bayside-cannabis': 70.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'hash rosin',
    description: 'Solventless hash rosin pressed from fresh-frozen bubble hash. 1g. Tropical, fruity terpene profile. Artisan quality.',
    likes: 389,
    dislikes: 2,
    brandId: 'default',
    thcPercent: 72.0,
    cbdPercent: 0.5,
    strainType: 'Hybrid',
    terpenes: [
      { name: 'Myrcene', percent: 5.2 },
      { name: 'Limonene', percent: 3.8 },
      { name: 'Caryophyllene', percent: 2.5 }
    ],
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Creative'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPICALS (4 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-pain-balm',
    name: '40 Tons Relief Balm',
    category: 'Topicals',
    price: 45.00,
    prices: { 'bayside-cannabis': 45.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || '',
    imageHint: 'cannabis balm',
    description: 'Targeted pain relief balm with 500mg THC + 500mg CBD. Infused with menthol and arnica. 2oz jar. Non-psychoactive.',
    likes: 276,
    dislikes: 3,
    brandId: 'default',
    thcPercent: 8.3,
    cbdPercent: 8.3,
    strainType: 'Topical',
    cannabinoids: [
      { name: 'THC', percent: 8.3 },
      { name: 'CBD', percent: 8.3 }
    ],
    effects: ['Pain Relief', 'Anti-inflammatory', 'Muscle Relaxation'],
  },
  {
    id: 'demo-40t-lotion',
    name: '40 Tons CBD Lotion',
    category: 'Topicals',
    price: 35.00,
    prices: { 'bayside-cannabis': 35.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || '',
    imageHint: 'cannabis lotion',
    description: 'Daily moisturizing lotion with 1000mg CBD. Lavender scented. 4oz bottle. Great for dry skin and daily wellness.',
    likes: 198,
    dislikes: 1,
    brandId: 'default',
    thcPercent: 0.0,
    cbdPercent: 8.3,
    strainType: 'CBD',
    cannabinoids: [
      { name: 'CBD', percent: 8.3 }
    ],
    effects: ['Moisturizing', 'Calming', 'Skin Health'],
  },
  {
    id: 'demo-40t-bath-bomb',
    name: '40 Tons Relaxation Bath Bomb',
    category: 'Topicals',
    price: 20.00,
    prices: { 'bayside-cannabis': 20.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product3')?.imageUrl || '',
    imageHint: 'cannabis bath bomb',
    description: 'Fizzy bath bomb with 100mg CBD + 50mg THC. Eucalyptus and lavender essential oils. Ultimate relaxation experience.',
    likes: 167,
    dislikes: 2,
    brandId: 'default',
    thcPercent: 0.0,
    cbdPercent: 0.0,
    strainType: 'Balanced',
    cannabinoids: [
      { name: 'CBD', percent: 100.0 },
      { name: 'THC', percent: 50.0 }
    ],
    effects: ['Relaxation', 'Stress Relief', 'Muscle Recovery'],
  },
  {
    id: 'demo-40t-massage-oil',
    name: '40 Tons Massage Oil',
    category: 'Topicals',
    price: 40.00,
    prices: { 'bayside-cannabis': 40.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || '',
    imageHint: 'cannabis massage oil',
    description: 'Sensual massage oil with 250mg THC + 250mg CBD. Warming formula with ginger and cinnamon. 4oz bottle.',
    likes: 145,
    dislikes: 1,
    brandId: 'default',
    thcPercent: 2.0,
    cbdPercent: 2.0,
    strainType: 'Balanced',
    cannabinoids: [
      { name: 'THC', percent: 2.0 },
      { name: 'CBD', percent: 2.0 }
    ],
    effects: ['Warming', 'Relaxation', 'Intimacy'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSORIES (4 products)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'demo-40t-grinder',
    name: '40 Tons Premium Grinder',
    category: 'Accessories',
    price: 25.00,
    prices: { 'bayside-cannabis': 25.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product4')?.imageUrl || '',
    imageHint: 'cannabis grinder',
    description: '4-piece aluminum grinder with kief catcher. 2.5" diameter. Sharp diamond teeth. 40 Tons logo engraved.',
    likes: 134,
    dislikes: 2,
    brandId: 'default',
    effects: [],
  },
  {
    id: 'demo-40t-rolling-tray',
    name: '40 Tons Rolling Tray',
    category: 'Accessories',
    price: 18.00,
    prices: { 'bayside-cannabis': 18.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product4')?.imageUrl || '',
    imageHint: 'rolling tray',
    description: 'Metal rolling tray with curved edges. 7" x 11". Custom 40 Tons artwork. Keeps your workspace tidy.',
    likes: 98,
    dislikes: 1,
    brandId: 'default',
    effects: [],
  },
  {
    id: 'demo-40t-stash-jar',
    name: '40 Tons UV Stash Jar',
    category: 'Accessories',
    price: 22.00,
    prices: { 'bayside-cannabis': 22.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product4')?.imageUrl || '',
    imageHint: 'stash jar',
    description: 'UV-protective glass jar to keep flower fresh. 4oz capacity. Airtight seal. Humidity pack included.',
    likes: 112,
    dislikes: 0,
    brandId: 'default',
    effects: [],
  },
  {
    id: 'demo-40t-battery',
    name: '40 Tons 510 Battery',
    category: 'Accessories',
    price: 20.00,
    prices: { 'bayside-cannabis': 20.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product7')?.imageUrl || '',
    imageHint: 'vape battery',
    description: 'Universal 510-thread battery for cartridges. 3 voltage settings. USB-C charging. Sleek matte black design.',
    likes: 156,
    dislikes: 3,
    brandId: 'default',
    effects: [],
  },
];

export const demoSlides = [
  {
    id: 1,
    title: "20% OFF ANY TWO ITEMS",
    subtitle: "FROM 8AM - 12PM",
    description: "The Best Deal in San Jose is Back!",
    cta: "Shop Now",
    bgColor: "bg-black",
    textColor: "text-white"
  },
  {
    id: 2,
    title: "HAPPY HOUR",
    subtitle: "4PM - 6PM EVERY DAY",
    description: "Get 15% off your entire order!",
    cta: "View Details",
    bgColor: "bg-primary/20",
    textColor: "text-foreground"
  },
  {
    id: 3,
    title: "NEW ARRIVALS",
    subtitle: "FRESH DROPS",
    description: "Check out the latest strains from 40 Tons!",
    cta: "Shop New",
    bgColor: "bg-green-900",
    textColor: "text-white"
  }
];

export const demoRetailers: Retailer[] = [
  {
    id: 'bayside-cannabis',
    name: 'Bayside Cannabis',
    address: '224-15 Union Turnpike',
    city: 'Queens',
    state: 'NY',
    zip: '11364',
    phone: '718-555-0102',
    email: 'orders@baysidecanna.com',
    lat: 40.7381,
    lon: -73.7698,
  }
];

export const demoLocations: Location[] = demoRetailers as Location[];

// Mock Timestamp to avoid Firebase dependency in demo data
const DemoTimestamp = {
  now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, toDate: () => new Date() }),
  fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0, toDate: () => date }),
};

export const demoCustomer = {
  favoriteRetailerId: 'disp-ny-alta-dispensary',
  orders: [
    { id: 'demo1', userId: 'demoUser', createdAt: DemoTimestamp.now(), status: 'completed', totals: { total: 45.00 } },
    { id: 'demo2', userId: 'demoUser', createdAt: DemoTimestamp.now(), status: 'ready', totals: { total: 65.00 } },
  ] as any[],
  reviews: [
    { id: 'rev1', productId: 'demo-40t-gg4', userId: 'demoUser1', brandId: 'default', rating: 5, text: 'This Gorilla Glue #4 from 40 Tons is the real deal. Incredibly relaxing, perfect for ending a stressful week.', createdAt: DemoTimestamp.fromDate(new Date('2024-05-20T19:30:00Z')) },
    { id: 'rev2', productId: 'demo-40t-runtz-vape', userId: 'demoUser2', brandId: 'default', rating: 5, text: 'The Runtz vape cart has an amazing fruity taste and a super happy, euphoric high. My new favorite for sure!', createdAt: DemoTimestamp.fromDate(new Date('2024-05-21T12:00:00Z')) },
    { id: 'rev3', productId: 'demo-40t-gg4', userId: 'demoUser3', brandId: 'default', rating: 4, text: 'Solid flower, great effects. A little dry on my last batch, but still one of the best GG4 cuts I\'ve had in NY.', createdAt: DemoTimestamp.fromDate(new Date('2024-05-22T14:15:00Z')) },
    { id: 'rev4', productId: 'demo-40t-og-preroll', userId: 'demoUser4', brandId: 'default', rating: 4, text: 'Super convenient pre-roll. Burned evenly and had that classic OG Kush effect. Good for a quick session.', createdAt: DemoTimestamp.fromDate(new Date('2024-05-22T18:45:00Z')) },
  ] as any[],
  interactions: [
    { brandId: 'default', recommendedProductIds: ['demo-40t-gg4', 'demo-40t-runtz-vape'] },
    { brandId: 'default', recommendedProductIds: ['demo-40t-og-preroll'] }
  ] as Partial<UserInteraction>[],
};
