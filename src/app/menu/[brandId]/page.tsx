import { MenuPage } from '@/components/menu-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cannabis Menus & Product Discovery | BakedBot AI',
    description: 'Browse the latest cannabis products, deals, and menus from licensed dispensaries. Powered by BakedBot AI.',
};

type MenuPageProps = {
  params: Promise<{ brandId: string }>;
};

export default async function BrandMenuPage({ params }: MenuPageProps) {
  const { brandId } = await params;
  return <MenuPage brandId={brandId || 'default'} />;
}
