
// src/components/dispensary-locator-section.tsx
'use client';

import DispensaryLocator from './dispensary-locator';
import { demoRetailers } from '@/lib/demo/demo-data';

export function DispensaryLocatorSection() {
  return (
    <DispensaryLocator locations={demoRetailers} />
  );
}
