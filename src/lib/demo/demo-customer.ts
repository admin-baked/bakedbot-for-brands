import type { Review, UserInteraction, OrderDoc } from '@/types/domain';
import { Timestamp } from 'firebase/firestore';

export const demoCustomer = {
    favoriteRetailerId: 'disp-ny-alta-dispensary',
    orders: [
        { id: 'demo1', userId: 'demoUser', createdAt: Timestamp.now(), status: 'completed', totals: { total: 45.00 } },
        { id: 'demo2', userId: 'demoUser', createdAt: Timestamp.now(), status: 'ready', totals: { total: 65.00 } },
    ] as Partial<OrderDoc>[],
    reviews: [
        { id: 'rev1', productId: 'demo-40t-gg4', userId: 'demoUser1', brandId: 'default', rating: 5, text: 'This Gorilla Glue #4 from 40 Tons is the real deal. Incredibly relaxing, perfect for ending a stressful week.', createdAt: Timestamp.fromDate(new Date('2024-05-20T19:30:00Z')) },
        { id: 'rev2', productId: 'demo-40t-runtz-vape', userId: 'demoUser2', brandId: 'default', rating: 5, text: 'The Runtz vape cart has an amazing fruity taste and a super happy, euphoric high. My new favorite for sure!', createdAt: Timestamp.fromDate(new Date('2024-05-21T12:00:00Z')) },
        { id: 'rev3', productId: 'demo-40t-gg4', userId: 'demoUser3', brandId: 'default', rating: 4, text: 'Solid flower, great effects. A little dry on my last batch, but still one of the best GG4 cuts I\'ve had in NY.', createdAt: Timestamp.fromDate(new Date('2024-05-22T14:15:00Z')) },
        { id: 'rev4', productId: 'demo-40t-og-preroll', userId: 'demoUser4', brandId: 'default', rating: 4, text: 'Super convenient pre-roll. Burned evenly and had that classic OG Kush effect. Good for a quick session.', createdAt: Timestamp.fromDate(new Date('2024-05-22T18:45:00Z')) },
    ] as Partial<Review>[],
    interactions: [
        { brandId: 'default', recommendedProductIds: ['demo-40t-gg4', 'demo-40t-runtz-vape'] },
        { brandId: 'default', recommendedProductIds: ['demo-40t-og-preroll'] }
    ] as Partial<UserInteraction>[],
};
