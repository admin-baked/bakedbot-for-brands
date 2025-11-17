
import { z } from 'zod';

/**
 * Schema for validating feedback submissions from the client.
 */
export const FeedbackSchema = z.object({
  productId: z.string().min(1),
  feedbackType: z.enum(['like', 'dislike']),
});
