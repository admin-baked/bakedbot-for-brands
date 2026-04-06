/**
 * @fileOverview Zod 3 Compatibility Bridge for Genkit.
 * 
 * Genkit 1.27.0 is incompatible with Zod 4 types.
 * This file provides the Zod 3 interface via Zod 4's internal v3 bridge.
 * We cast to any to ensure structural compatibility with Genkit's internal Zod 3 expectations.
 */

// @ts-ignore - Using the official Zod 4 v3 bridge subpath
import { z as _z } from 'zod';

const z = _z as typeof _z;

export { z };
export type { ZodType, ZodObject, ZodSchema } from 'zod';
export default z;

// Re-export Zod's infer type for use in other files
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ZodInfer<T = any> = _z.infer<any>;


