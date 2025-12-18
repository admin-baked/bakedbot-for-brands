// src/app/shop/page.tsx
/**
 * Shop Page - Consumer Marketplace
 * Aggregates local menus and routes checkout to licensed operators
 */

import { Metadata } from 'next';
import ShopClient from './shop-client';

export const metadata: Metadata = {
    title: 'Shop Cannabis | BakedBot',
    description: 'Find and compare cannabis products from licensed dispensaries near you. Search by effect, price, rating, and more.',
    openGraph: {
        title: 'Shop Cannabis Near You | BakedBot',
        description: 'Find the highest rated flower, edibles, vapes, and more from licensed dispensaries.',
        type: 'website',
    },
};

export default function ShopPage() {
    return <ShopClient />;
}
