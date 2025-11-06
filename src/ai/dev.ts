import { config } from 'dotenv';
config();

import '@/ai/flows/generate-product-description.ts';
import '@/ai/flows/generate-social-image.ts';
import '@/ai/tools/get-product-reviews.ts';
import '@/ai/flows/summarize-reviews.ts';
