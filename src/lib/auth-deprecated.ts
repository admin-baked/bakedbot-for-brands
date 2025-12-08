/**
 * DEPRECATED: This module contains legacy authentication code.
 * 
 * CRITICAL SECURITY NOTE:
 * Client-side authentication is insecure and has been deprecated.
 * All authentication must now use src/server/auth/auth.ts
 * 
 * The old getCurrentUser() function was a development-only stub with:
 * ❌ Dev bypass hardcoded
 * ❌ No server-side validation
 * ❌ Client-side role storage
 * 
 * MIGRATION PATH:
 * 1. Replace all getCurrentUser() calls with requireUser() from src/server/auth/auth.ts
 * 2. Ensure code calling auth is marked 'use server'
 * 3. Use withAuth HOC wrapper for client components that need user context
 * 4. Validate role at server action entry points
 * 
 * @deprecated See src/server/auth/auth.ts for the production-ready implementation
 */

// This file is intentionally empty - all auth code has been migrated to src/server/auth/auth.ts
