import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams?: SearchParams): string {
  const params = new URLSearchParams();
  if (!searchParams) return '';

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'string' && v.length > 0) params.append(key, v);
      }
    }
  }

  return params.toString();
}

export default function DemoPage({ searchParams }: { searchParams?: SearchParams }) {
  const qs = toQueryString(searchParams);
  redirect(qs ? `/demo-shop?${qs}` : '/demo-shop');
}

