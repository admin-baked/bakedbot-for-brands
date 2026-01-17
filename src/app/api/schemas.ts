/**
 * Shared Zod schemas for API route validation
 *
 * These schemas provide type-safe validation for all API endpoints.
 * Import and use with the withProtection middleware for automatic validation.
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

export const idSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const orgIdSchema = z.object({
  orgId: z.string().min(1, 'Organization ID is required'),
});

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

export const chatRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  brandId: z.string().optional().default('10982'),
  state: z.string().optional().default('Illinois'),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

// NOTE: 'cannpay' is the internal value for Smokey Pay (customer-facing brand name)
// Internal code uses 'cannpay', customer-facing UI displays 'Smokey Pay'
const paymentMethodEnum = z.enum(['dispensary_direct', 'cannpay', 'credit_card']);

const customerSchema = z.object({
  uid: z.string().optional(),
  id: z.string().optional(),
  dateOfBirth: z.string().optional(),
  hasMedicalCard: z.boolean().optional(),
  state: z.string().optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const cartItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  category: z.string().optional(),
  productType: z.enum(['flower', 'concentrate', 'edibles']).optional(),
  thcPercent: z.number().optional(),
  cbdPercent: z.number().optional(),
});

const opaqueDataSchema = z.object({
  dataDescriptor: z.string(),
  dataValue: z.string(),
});

const cannpayDataSchema = z.object({
  intentId: z.string(),
  transactionNumber: z.string(),
  status: z.string(),
});

const creditCardDataSchema = z.object({
  opaqueData: opaqueDataSchema.optional(),
  cardNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  cvv: z.string().optional(),
});

export const processPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: paymentMethodEnum.default('dispensary_direct'),
  paymentData: z.union([cannpayDataSchema, creditCardDataSchema]).optional(),
  customer: customerSchema.optional(),
  orderId: z.string().optional(),
  cart: z.array(cartItemSchema).optional(),
  dispensaryState: z.string().optional(),
}).refine((data) => {
  // For online payments, require paymentData
  if (['cannpay', 'credit_card'].includes(data.paymentMethod) && !data.paymentData) {
    return false;
  }
  return true;
}, {
  message: 'Payment data required for online payments',
  path: ['paymentData'],
});

export type ProcessPaymentRequest = z.infer<typeof processPaymentSchema>;

// ============================================================================
// AGENT DISPATCH SCHEMAS
// ============================================================================

export const agentDispatchSchema = z.object({
  orgId: z.string().min(1, 'Organization ID is required'),
  limit: z.number().int().positive().max(100).optional().default(20),
});

export type AgentDispatchRequest = z.infer<typeof agentDispatchSchema>;

// ============================================================================
// CANNMENUS SCHEMAS
// ============================================================================

export const cannmenusSyncSchema = z.object({
  brandId: z.string().optional(),
  retailers: z.string().optional(),
  forceFullSync: z.boolean().optional().default(false),
});

export type CannmenusSyncRequest = z.infer<typeof cannmenusSyncSchema>;

export const cannmenusSearchSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
  retailers: z.string().optional(),
  brands: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  page: z.number().int().positive().optional().default(1),
});

export type CannmenusSearchRequest = z.infer<typeof cannmenusSearchSchema>;

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

export const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  dispensaryId: z.string().min(1, 'Dispensary ID is required'),
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  subtotal: z.number().positive('Subtotal must be positive'),
  tax: z.number().nonnegative('Tax cannot be negative'),
  total: z.number().positive('Total must be positive'),
  deliveryMethod: z.enum(['pickup', 'delivery']).optional().default('pickup'),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const createTaskSchema = z.object({
  orgId: z.string().min(1, 'Organization ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  taskType: z.string().min(1, 'Task type is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  payload: z.record(z.any()).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export type CreateTaskRequest = z.infer<typeof createTaskSchema>;

// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.string()).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export type AnalyticsQueryRequest = z.infer<typeof analyticsQuerySchema>;

// ============================================================================
// RECOMMENDATION SCHEMAS
// ============================================================================

export const recommendationFeedbackSchema = z.object({
  recommendationId: z.string().min(1, 'Recommendation ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  feedback: z.enum(['liked', 'disliked', 'purchased', 'ignored']),
  timestamp: z.string().datetime().optional(),
});

export type RecommendationFeedbackRequest = z.infer<typeof recommendationFeedbackSchema>;

// ============================================================================
// EXPERIMENT SCHEMAS
// ============================================================================

export const experimentAssignSchema = z.object({
  experimentId: z.string().min(1, 'Experiment ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  context: z.record(z.any()).optional(),
});

export type ExperimentAssignRequest = z.infer<typeof experimentAssignSchema>;

export const experimentTrackSchema = z.object({
  experimentId: z.string().min(1, 'Experiment ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  variant: z.string().min(1, 'Variant is required'),
  eventType: z.string().min(1, 'Event type is required'),
  eventData: z.record(z.any()).optional(),
});

export type ExperimentTrackRequest = z.infer<typeof experimentTrackSchema>;

// ============================================================================
// EZAL SCHEMAS
// ============================================================================

export const ezalCreateCompetitorSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().optional().default('dispensary'),
  state: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  menuUrl: z.string().url().optional(),
  primaryDomain: z.string().url().optional(),
  brandsFocus: z.array(z.string()).optional(),
  quickSetup: z.boolean().optional(),
  parserProfileId: z.string().optional(),
  frequencyMinutes: z.number().int().positive().optional(),
});

export type EzalCreateCompetitorRequest = z.infer<typeof ezalCreateCompetitorSchema>;

// ============================================================================
// TICKET SCHEMAS
// ============================================================================

export const createTicketSchema = z.object({
  description: z.string().min(1, 'Description is required').max(2000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  category: z.string().optional().default('system_error'),
  screenshotUrl: z.union([z.string().url(), z.literal('')]).optional(),
  metadata: z.record(z.any()).optional(),
  url: z.string().optional(),
  title: z.string().optional(), // Added to match client payload
  pageUrl: z.string().optional(), // Added to match client payload
  reporterEmail: z.string().optional(), // Added to match client payload
  userAgent: z.string().optional(), // Added to match client payload
  errorDigest: z.string().optional(), // Added to match client payload
  errorStack: z.string().optional(), // Added to match client payload
});

export type CreateTicketRequest = z.infer<typeof createTicketSchema>;
