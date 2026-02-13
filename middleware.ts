import type { NextRequest } from 'next/server';

// Centralized Edge middleware lives in src/proxy.ts (route protection + custom domain routing).
import { proxy, config } from './src/proxy';

export function middleware(request: NextRequest) {
  return proxy(request);
}

export { config };

