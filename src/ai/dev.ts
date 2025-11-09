
'use server';
import { config } from 'dotenv';
config();

import './flows/generate-product-description.ts';
import './flows/generate-social-image.ts';
import './tools/get-product-reviews.ts';
import './tools/get-product.ts';
import './flows/summarize-reviews.ts';
import './ai-powered-product-recommendations.ts';
import './flows/send-order-email.ts';
