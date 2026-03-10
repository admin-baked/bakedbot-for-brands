'use client';

import type { BrandGuide, CreateBrandGuideInput } from '@/types/brand-guide';

type CreateBrandGuideResponse = {
  success: boolean;
  brandGuide?: BrandGuide;
  error?: string;
};

export async function createBrandGuideViaApi(input: CreateBrandGuideInput): Promise<CreateBrandGuideResponse> {
  const response = await fetch('/api/brand-guide/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as CreateBrandGuideResponse | null;
  if (!response.ok || !payload) {
    return {
      success: false,
      error: payload?.error || 'Failed to create brand guide',
    };
  }

  return payload;
}
