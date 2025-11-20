
// src/app/menu/[brandId]/page.tsx

import React from "react";
import MenuPageClient from "../../menu-page-client";

type BrandMenuPageProps = {
  params: { brandId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

/**
 * This page handles rendering the menu for a specific brand, determined by the URL.
 * It passes the brandId to the client component, which then gets its data
 * from the server layout's context.
 */
export default function BrandMenuPage({ params }: BrandMenuPageProps) {
  return <MenuPageClient brandId={params.brandId} />;
}
