// app/menu/[brandId]/page.tsx
import { MenuPage } from '@/components/menu-page';

type MenuPageProps = {
  params: Promise<{ brandId: string }>;
};

export default async function BrandMenuPage({ params }: MenuPageProps) {
  const { brandId } = await params;
  return <MenuPage brandId={brandId || 'default'} />;
}
