
/**
 * @fileOverview Zod 3 Compatibility Bridge for Genkit.
 * 
 * Genkit 1.27.0 is incompatible with Zod 4 types.
 * This file provides the Zod 3 interface via Zod 4's internal v3 bridge.
 */

// @ts-ignore - Targeting internal zod/v3 sub-module directly to bypass resolution errors
import { z } from '../../node_modules/zod/v3/index.js';

export { z };
export default z;
