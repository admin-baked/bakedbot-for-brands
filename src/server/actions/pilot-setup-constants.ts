/**
 * Pilot Setup Constants
 *
 * Seed data for pilot setup - moved here from pilot-setup.ts to avoid
 * Next.js 'use server' validation error (server action files can only export async functions)
 */

import type { CustomerSegment } from '@/types/customers';

/**
 * Sample customer segments for pilot testing
 */
export const PILOT_CUSTOMER_SEGMENTS: Array<{
    segment: CustomerSegment;
    email: string;
    firstName: string;
    lastName: string;
    description: string;
    behaviorProfile: {
        orderCount: number;
        totalSpent: number;
        avgOrderValue: number;
        daysSinceLastOrder: number;
        daysSinceFirstOrder: number;
        priceRange: 'budget' | 'mid' | 'premium';
    };
}> = [
    {
        segment: 'vip',
        email: 'vip@bakedbot.ai',
        firstName: 'Victor',
        lastName: 'VIP',
        description: 'Top 10% by spend - High lifetime value customer',
        behaviorProfile: {
            orderCount: 25,
            totalSpent: 2500,
            avgOrderValue: 100,
            daysSinceLastOrder: 5,
            daysSinceFirstOrder: 180,
            priceRange: 'premium',
        },
    },
    {
        segment: 'loyal',
        email: 'loyal@bakedbot.ai',
        firstName: 'Larry',
        lastName: 'Loyal',
        description: 'Regular, consistent buyer with 3+ orders',
        behaviorProfile: {
            orderCount: 8,
            totalSpent: 480,
            avgOrderValue: 60,
            daysSinceLastOrder: 14,
            daysSinceFirstOrder: 120,
            priceRange: 'mid',
        },
    },
    {
        segment: 'new',
        email: 'newbie@bakedbot.ai',
        firstName: 'Nancy',
        lastName: 'Newcomer',
        description: 'New customer - first order within 30 days',
        behaviorProfile: {
            orderCount: 1,
            totalSpent: 45,
            avgOrderValue: 45,
            daysSinceLastOrder: 7,
            daysSinceFirstOrder: 7,
            priceRange: 'budget',
        },
    },
    {
        segment: 'at_risk',
        email: 'atrisk@bakedbot.ai',
        firstName: 'Rita',
        lastName: 'AtRisk',
        description: 'At risk customer - 60+ days since last order',
        behaviorProfile: {
            orderCount: 4,
            totalSpent: 280,
            avgOrderValue: 70,
            daysSinceLastOrder: 75,
            daysSinceFirstOrder: 200,
            priceRange: 'mid',
        },
    },
    {
        segment: 'slipping',
        email: 'slipping@bakedbot.ai',
        firstName: 'Sam',
        lastName: 'Slipping',
        description: 'Slipping customer - 30-60 days inactive',
        behaviorProfile: {
            orderCount: 5,
            totalSpent: 325,
            avgOrderValue: 65,
            daysSinceLastOrder: 45,
            daysSinceFirstOrder: 150,
            priceRange: 'mid',
        },
    },
    {
        segment: 'churned',
        email: 'churned@bakedbot.ai',
        firstName: 'Charlie',
        lastName: 'Churned',
        description: 'Churned customer - 90+ days inactive',
        behaviorProfile: {
            orderCount: 3,
            totalSpent: 150,
            avgOrderValue: 50,
            daysSinceLastOrder: 120,
            daysSinceFirstOrder: 240,
            priceRange: 'budget',
        },
    },
    {
        segment: 'high_value',
        email: 'highspender@bakedbot.ai',
        firstName: 'Hannah',
        lastName: 'HighValue',
        description: 'High value - High AOV but low frequency',
        behaviorProfile: {
            orderCount: 3,
            totalSpent: 600,
            avgOrderValue: 200,
            daysSinceLastOrder: 20,
            daysSinceFirstOrder: 90,
            priceRange: 'premium',
        },
    },
    {
        segment: 'frequent',
        email: 'frequent@bakedbot.ai',
        firstName: 'Frank',
        lastName: 'Frequent',
        description: 'Frequent buyer - Many orders, lower AOV',
        behaviorProfile: {
            orderCount: 15,
            totalSpent: 525,
            avgOrderValue: 35,
            daysSinceLastOrder: 3,
            daysSinceFirstOrder: 60,
            priceRange: 'budget',
        },
    },
];

/**
 * Sample product data for Thrive Syracuse based on NY market
 */
export const THRIVE_SAMPLE_PRODUCTS = [
    // Flower
    { name: 'Bubba Kush', category: 'Flower', price: 45, brandName: "Kiefer's", thcPercent: 22, weight: '3.5g', strainType: 'indica' },
    { name: 'Blue Dream', category: 'Flower', price: 40, brandName: 'Off Hours', thcPercent: 18, weight: '3.5g', strainType: 'hybrid' },
    { name: 'Sour Diesel', category: 'Flower', price: 50, brandName: "Kiefer's", thcPercent: 24, weight: '3.5g', strainType: 'sativa' },
    { name: 'OG Kush', category: 'Flower', price: 55, brandName: 'Off Hours', thcPercent: 26, weight: '3.5g', strainType: 'hybrid' },
    { name: 'Gelato', category: 'Flower', price: 48, brandName: "Kiefer's", thcPercent: 21, weight: '3.5g', strainType: 'hybrid' },
    // Pre-Rolls
    { name: 'Classic Pre-Roll', category: 'Pre-Rolls', price: 12, brandName: 'Off Hours', thcPercent: 20, weight: '1g', strainType: 'hybrid' },
    { name: 'Infused Pre-Roll', category: 'Pre-Rolls', price: 25, brandName: "Kiefer's", thcPercent: 35, weight: '1g', strainType: 'indica' },
    { name: 'Sativa Pre-Roll 2-Pack', category: 'Pre-Rolls', price: 20, brandName: 'Off Hours', thcPercent: 18, weight: '0.5g x 2', strainType: 'sativa' },
    // Vapes
    { name: 'Live Resin Cart', category: 'Vapes', price: 60, brandName: "Kiefer's", thcPercent: 85, weight: '0.5g', strainType: 'hybrid' },
    { name: 'Disposable Vape', category: 'Vapes', price: 35, brandName: 'Off Hours', thcPercent: 80, weight: '0.3g', strainType: 'indica' },
    { name: 'Full Gram Cart', category: 'Vapes', price: 85, brandName: "Kiefer's", thcPercent: 90, weight: '1g', strainType: 'sativa' },
    // Edibles
    { name: 'Gummy Bears 10pk', category: 'Edibles', price: 30, brandName: 'Camino', thcPercent: null, weight: '100mg total', strainType: 'hybrid' },
    { name: 'Chocolate Bar', category: 'Edibles', price: 25, brandName: 'Kiva', thcPercent: null, weight: '100mg total', strainType: 'indica' },
    { name: 'Mints Tin', category: 'Edibles', price: 20, brandName: 'Petra', thcPercent: null, weight: '40mg total', strainType: 'hybrid' },
    { name: 'Seltzer 4-Pack', category: 'Drinks', price: 28, brandName: 'Cann', thcPercent: null, weight: '2mg each', strainType: 'hybrid' },
    // Concentrates
    { name: 'Live Rosin', category: 'Concentrates', price: 70, brandName: "Kiefer's", thcPercent: 75, weight: '1g', strainType: 'hybrid' },
    { name: 'Badder', category: 'Concentrates', price: 55, brandName: 'Off Hours', thcPercent: 80, weight: '1g', strainType: 'indica' },
    // Wellness
    { name: 'CBD:THC Tincture 1:1', category: 'Wellness', price: 45, brandName: 'Care By Design', thcPercent: null, weight: '30ml', cbdPercent: 15 },
    { name: 'Pain Relief Topical', category: 'Wellness', price: 35, brandName: 'Papa & Barkley', thcPercent: null, weight: '2oz', cbdPercent: 10 },
];
