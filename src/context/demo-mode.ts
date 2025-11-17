
// src/context/demo-mode.ts
import { useCookieStore } from "@/lib/cookie-storage";

// This hook now acts as a simple proxy to the Zustand cookie store.
export function useDemoMode() {
  const { isDemo, setIsDemo } = useCookieStore();
  return { isDemo, setIsDemo };
}
