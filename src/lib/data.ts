
import type { Product, Retailer, Review, UserInteraction, OrderDoc, Location } from '@/types/domain';
import { PlaceHolderImages } from './placeholder-images';
import { Timestamp } from 'firebase/firestore';

// Direct export of default assets to prevent broken links.
// These URLs point to publicly accessible files in a Google Cloud Storage bucket.
export const defaultLogo = 'https://storage.googleapis.com/stedi-assets/misc/bakedbot-logo-horizontal.png';
export const defaultChatbotIcon = 'https://storage.googleapis.com/stedi-assets/misc/smokey-icon-1.png';
