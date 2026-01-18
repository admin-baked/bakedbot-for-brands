'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Leaf, Wind, Cookie, Droplet, Sparkles, FlaskConical, Heart, Package } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon?: LucideIcon;
  image?: string;
  productCount?: number;
  description?: string;
}

interface CategoryGridProps {
  categories?: Category[];
  title?: string;
  onCategoryClick?: (categoryId: string) => void;
  primaryColor?: string;
}

const defaultCategories: Category[] = [
  { id: 'flower', name: 'Flower', icon: Leaf, productCount: 156, description: 'Premium buds' },
  { id: 'prerolls', name: 'Pre-Rolls', icon: Wind, productCount: 89, description: 'Ready to smoke' },
  { id: 'vapes', name: 'Vapes', icon: Wind, productCount: 124, description: 'Carts & pods' },
  { id: 'edibles', name: 'Edibles', icon: Cookie, productCount: 78, description: 'Gummies & more' },
  { id: 'concentrates', name: 'Concentrates', icon: Sparkles, productCount: 67, description: 'Dabs & wax' },
  { id: 'tinctures', name: 'Tinctures', icon: Droplet, productCount: 34, description: 'Oils & drops' },
  { id: 'topicals', name: 'Topicals', icon: Heart, productCount: 45, description: 'Creams & balms' },
  { id: 'accessories', name: 'Accessories', icon: Package, productCount: 52, description: 'Gear & tools' },
];

export function CategoryGrid({
  categories = defaultCategories,
  title = 'Shop by Category',
  onCategoryClick,
  primaryColor = '#16a34a',
}: CategoryGridProps) {
  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          <Button variant="link" className="gap-1 font-semibold" style={{ color: primaryColor }}>
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category) => {
            const IconComponent = category.icon || Leaf;
            return (
              <Card
                key={category.id}
                className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                onClick={() => onCategoryClick?.(category.id)}
              >
                <div className="p-4 flex flex-col items-center text-center">
                  {/* Icon/Image */}
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    ) : (
                      <IconComponent
                        className="w-8 h-8 md:w-10 md:h-10"
                        style={{ color: primaryColor }}
                      />
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="font-semibold text-sm md:text-base">{category.name}</h3>

                  {/* Product Count */}
                  {category.productCount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.productCount} items
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
