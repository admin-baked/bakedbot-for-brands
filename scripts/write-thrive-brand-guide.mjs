/**
 * One-shot script: write Thrive Syracuse brand guide to Firestore.
 * Run: node scripts/write-thrive-brand-guide.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync(new URL('../firebase-service-account.json', import.meta.url))
);

if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

const brandGuide = {
    orgId: 'org_thrive_syracuse',
    brandName: 'Thrive Cannabis Marketplace',
    updatedAt: new Date(),
    approvedAt: '2026-04-17',
    approvedBy: 'martez@bakedbot.ai',
    sourceEmail: '4/20 Re-Engagement campaign (Firestore: 3HQBxXGqhWcbbdmFOj8R)',
    colors: {
        teal:        { hex: '#27c0dd', usage: 'Header background, CTA buttons, links' },
        gold:        { hex: '#f1b200', usage: 'Badge/accent pill, highlights' },
        dark:        { hex: '#0d2b31', usage: 'Outer background, footer, hero blocks' },
        bodyHeading: { hex: '#1a8fa3', usage: 'H2/subheadings in white-card sections' },
        cardBg:      { hex: '#ffffff', usage: 'Card/content background' },
    },
    logo: {
        png: 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_thrivesyracuse/logo/thrive_logo.png',
        displayWidth: 160,
        emailWidth: 160,
    },
    contact: {
        address: '3065 Erie Blvd E, Syracuse, NY 13224',
        phone: '315-207-7935',
        hours: 'Mon–Sat 10:30 AM–8 PM · Sun 11 AM–6 PM',
        fromEmail: 'hello@bakedbot.ai',
        fromName: 'Thrive Cannabis Marketplace',
    },
    email: {
        templateModule: 'src/lib/email/thrive-template.ts',
        exports: ['thriveEmail', 'thriveCard', 'thriveHero', 'thriveCta', 'thriveLoyaltyBlock', 'thriveHeader', 'thriveFooter', 'THRIVE'],
        notes: 'All Thrive transactional + campaign emails MUST use this module. Do not inline Thrive brand colors.',
    },
};

const ref = db.collection('brandGuides').doc('org_thrive_syracuse');
await ref.set(brandGuide, { merge: true });
console.log('✅ Thrive brand guide written to Firestore brandGuides/org_thrive_syracuse');
