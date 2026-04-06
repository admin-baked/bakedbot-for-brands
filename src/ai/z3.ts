
/**
 * @fileOverview Zod 3 Compatibility Bridge for Genkit.
 * 
 * Genkit 1.27.0 is incompatible with Zod 4 types.
 * This file provides the Zod 3 interface via Zod 4's internal v3 bridge.
 * We cast to any to ensure structural compatibility with Genkit's internal Zod 3 expectations.
 */

// @ts-ignore - Using the official Zod 4 v3 bridge subpath
import { z as _z } from 'zod/v3';

const z = _z as any;

export { z };
export default z;
