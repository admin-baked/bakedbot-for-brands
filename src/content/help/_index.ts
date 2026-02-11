import { HelpArticleMeta } from '@/server/actions/help-actions';

/**
 * Help Article Registry
 * Single source of truth for all help articles
 * Add new articles here and they'll automatically appear in the help center
 */
export const articles: Record<string, HelpArticleMeta> = {
  'getting-started/welcome': {
    slug: 'welcome',
    category: 'getting-started',
    title: 'Welcome to BakedBot',
    description: 'Get started with BakedBot AI Commerce OS for the cannabis industry',
    roles: [], // Public
    tags: ['onboarding', 'overview', 'introduction'],
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    filePath: './getting-started/welcome.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'getting-started/brand-quick-start': {
    slug: 'brand-quick-start',
    category: 'getting-started',
    title: 'Brand Quick Start Guide',
    description: 'Get your cannabis brand up and running on BakedBot in 15 minutes',
    roles: [], // Public
    tags: ['onboarding', 'brand', 'quickstart', 'setup'],
    difficulty: 'beginner',
    estimatedTime: '15 minutes',
    filePath: './getting-started/brand-quick-start.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'getting-started/dispensary-setup': {
    slug: 'dispensary-setup',
    category: 'getting-started',
    title: 'Dispensary Setup Guide',
    description: 'Set up your dispensary on BakedBot and start serving customers',
    roles: [], // Public
    tags: ['onboarding', 'dispensary', 'setup', 'quickstart'],
    difficulty: 'beginner',
    estimatedTime: '15 minutes',
    filePath: './getting-started/dispensary-setup.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'products/adding-products': {
    slug: 'adding-products',
    category: 'products',
    title: 'Adding Products to Your Catalog',
    description: 'Learn three ways to add products: manually, CSV import, or POS sync',
    roles: ['brand', 'super_user'],
    tags: ['products', 'getting-started', 'pos', 'catalog'],
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    filePath: './products/adding-products.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/introduction': {
    slug: 'introduction',
    category: 'agents',
    title: 'Introduction to AI Agents',
    description: 'Meet your AI agent squad and learn how they work together',
    roles: [], // Public
    tags: ['ai-agents', 'overview', 'getting-started'],
    difficulty: 'beginner',
    estimatedTime: '8 minutes',
    filePath: './agents/introduction.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/smokey': {
    slug: 'smokey',
    category: 'agents',
    title: 'Smokey - AI Budtender',
    description: 'Your 24/7 AI budtender for customer recommendations and order routing',
    roles: [], // Public
    tags: ['ai-agents', 'smokey', 'chatbot', 'customer-service'],
    difficulty: 'beginner',
    estimatedTime: '12 minutes',
    filePath: './agents/smokey.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'troubleshooting/common-issues': {
    slug: 'common-issues',
    category: 'troubleshooting',
    title: 'Common Issues & Solutions',
    description: 'Quick fixes for the most common problems in BakedBot',
    roles: [], // Public
    tags: ['troubleshooting', 'help', 'faq', 'support'],
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    filePath: './troubleshooting/common-issues.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/craig': {
    slug: 'craig',
    category: 'agents',
    title: 'Craig - Marketing Automation',
    description: 'Automate campaigns with AI-powered SMS, email, and social media marketing',
    roles: [], // Public
    tags: ['ai-agents', 'craig', 'marketing', 'automation', 'campaigns'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './agents/craig.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/ezal': {
    slug: 'ezal',
    category: 'agents',
    title: 'Ezal - Competitive Intelligence',
    description: 'Monitor competitors 24/7, track pricing, and identify market opportunities',
    roles: [], // Public
    tags: ['ai-agents', 'ezal', 'competitive-intelligence', 'market-analysis', 'pricing'],
    difficulty: 'intermediate',
    estimatedTime: '12 minutes',
    filePath: './agents/ezal.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'integrations/pos-overview': {
    slug: 'pos-overview',
    category: 'integrations',
    title: 'POS Systems Overview',
    description: 'Compare POS integrations and choose the right one for your business',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['integrations', 'pos', 'alleaves', 'dutchie', 'jane', 'setup'],
    difficulty: 'beginner',
    estimatedTime: '8 minutes',
    filePath: './integrations/pos-overview.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'troubleshooting/pos-sync-problems': {
    slug: 'pos-sync-problems',
    category: 'troubleshooting',
    title: 'POS Sync Problems',
    description: 'Detailed troubleshooting for POS integration issues',
    roles: [], // Public
    tags: ['troubleshooting', 'pos', 'integrations', 'sync', 'alleaves', 'dutchie'],
    difficulty: 'intermediate',
    estimatedTime: '10 minutes',
    filePath: './troubleshooting/pos-sync-problems.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/deebo': {
    slug: 'deebo',
    category: 'agents',
    title: 'Deebo - Compliance Officer',
    description: 'AI compliance enforcer that keeps marketing and content legal across all cannabis markets',
    roles: [], // Public
    tags: ['ai-agents', 'deebo', 'compliance', 'regulations', 'legal'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './agents/deebo.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/money-mike': {
    slug: 'money-mike',
    category: 'agents',
    title: 'Money Mike - Pricing Strategist',
    description: 'AI pricing strategist who optimizes prices, protects margins, and maximizes revenue',
    roles: [], // Public
    tags: ['ai-agents', 'money-mike', 'pricing', 'revenue', 'margins', 'competitive-pricing'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './agents/money-mike.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'products/product-optimization': {
    slug: 'product-optimization',
    category: 'products',
    title: 'Product Search Optimization',
    description: 'Optimize product listings for better Smokey recommendations and customer discovery',
    roles: ['brand', 'super_user'],
    tags: ['products', 'optimization', 'seo', 'smokey', 'search'],
    difficulty: 'intermediate',
    estimatedTime: '12 minutes',
    filePath: './products/product-optimization.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'marketing/campaigns': {
    slug: 'campaigns',
    category: 'marketing',
    title: 'Creating Marketing Campaigns',
    description: 'Launch SMS, email, and social media campaigns from planning to execution',
    roles: ['brand', 'super_user'],
    tags: ['marketing', 'campaigns', 'sms', 'email', 'social-media', 'craig'],
    difficulty: 'beginner',
    estimatedTime: '15 minutes',
    filePath: './marketing/campaigns.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/mrs-parker': {
    slug: 'mrs-parker',
    category: 'agents',
    title: 'Mrs. Parker - Customer Retention',
    description: 'AI retention specialist who predicts churn and designs loyalty programs',
    roles: [], // Public
    tags: ['ai-agents', 'mrs-parker', 'retention', 'loyalty', 'churn', 'customer-success'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './agents/mrs-parker.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/pops': {
    slug: 'pops',
    category: 'agents',
    title: 'Pops - Data Analyst',
    description: 'AI data analyst who turns raw data into actionable insights and forecasts trends',
    roles: [], // Public
    tags: ['ai-agents', 'pops', 'analytics', 'data', 'forecasting', 'reporting'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './agents/pops.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/day-day': {
    slug: 'day-day',
    category: 'agents',
    title: 'Day Day - SEO & Growth',
    description: 'AI SEO specialist who optimizes rankings, tracks keywords, and drives organic traffic',
    roles: [], // Public
    tags: ['ai-agents', 'day-day', 'seo', 'growth', 'keywords', 'organic-traffic'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './agents/day-day.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'marketing/sms-marketing': {
    slug: 'sms-marketing',
    category: 'marketing',
    title: 'SMS Marketing with Blackleaf',
    description: 'Master SMS campaigns with 98% open rates using Blackleaf integration',
    roles: ['brand', 'super_user'],
    tags: ['marketing', 'sms', 'blackleaf', 'campaigns', 'automation'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './marketing/sms-marketing.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'marketing/email-marketing': {
    slug: 'email-marketing',
    category: 'marketing',
    title: 'Email Marketing with Mailjet',
    description: 'Build relationships and drive sales through high-converting email campaigns',
    roles: ['brand', 'super_user'],
    tags: ['marketing', 'email', 'mailjet', 'campaigns', 'automation', 'workflows'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './marketing/email-marketing.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/bundles': {
    slug: 'bundles',
    category: 'dispensary',
    title: 'Creating Product Bundles',
    description: 'Increase AOV with product bundles that move inventory and create value',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['dispensary', 'bundles', 'products', 'upsell', 'aov'],
    difficulty: 'beginner',
    estimatedTime: '12 minutes',
    filePath: './dispensary/bundles.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/orders': {
    slug: 'orders',
    category: 'dispensary',
    title: 'Managing Orders',
    description: 'Efficiently process orders from placement to fulfillment',
    roles: ['brand', 'super_user', 'dispensary_admin', 'dispensary_staff'],
    tags: ['dispensary', 'orders', 'fulfillment', 'pickup', 'delivery'],
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    filePath: './dispensary/orders.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/menu-sync': {
    slug: 'menu-sync',
    category: 'dispensary',
    title: 'Menu Synchronization',
    description: 'Keep your online menu synced with POS for accurate inventory and pricing',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['dispensary', 'menu', 'pos', 'sync', 'inventory'],
    difficulty: 'intermediate',
    estimatedTime: '10 minutes',
    filePath: './dispensary/menu-sync.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'analytics/understanding-dashboard': {
    slug: 'understanding-dashboard',
    category: 'analytics',
    title: 'Understanding Your Dashboard',
    description: 'Read key metrics, interpret data, and make data-driven decisions',
    roles: [], // Public
    tags: ['analytics', 'dashboard', 'metrics', 'kpis', 'reporting'],
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    filePath: './analytics/understanding-dashboard.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'integrations/alleaves': {
    slug: 'alleaves',
    category: 'integrations',
    title: 'Alleaves Integration',
    description: 'Complete guide to integrating Alleaves POS with BakedBot',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['integrations', 'pos', 'alleaves', 'sync', 'setup'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './integrations/alleaves.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'getting-started/dashboard-overview': {
    slug: 'dashboard-overview',
    category: 'getting-started',
    title: 'Dashboard Overview',
    description: 'Learn to navigate your BakedBot dashboard and access key features',
    roles: [], // Public
    tags: ['getting-started', 'dashboard', 'navigation', 'interface'],
    difficulty: 'beginner',
    estimatedTime: '8 minutes',
    filePath: './getting-started/dashboard-overview.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/loyalty-program': {
    slug: 'loyalty-program',
    category: 'dispensary',
    title: 'Loyalty Program Setup',
    description: 'Build customer loyalty with rewards that drive repeat purchases',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['dispensary', 'loyalty', 'rewards', 'retention', 'points'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './dispensary/loyalty-program.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'integrations/dutchie': {
    slug: 'dutchie',
    category: 'integrations',
    title: 'Dutchie Integration',
    description: 'Connect Dutchie for seamless menu sync and order management',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['integrations', 'pos', 'dutchie', 'sync', 'oauth'],
    difficulty: 'intermediate',
    estimatedTime: '12 minutes',
    filePath: './integrations/dutchie.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'analytics/sales-funnel': {
    slug: 'sales-funnel',
    category: 'analytics',
    title: 'Sales Funnel Analysis',
    description: 'Understand customer journey, identify bottlenecks, optimize conversion',
    roles: ['brand', 'super_user'],
    tags: ['analytics', 'funnel', 'conversion', 'optimization', 'metrics'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './analytics/sales-funnel.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'products/inventory-management': {
    slug: 'inventory-management',
    category: 'products',
    title: 'Inventory Management',
    description: 'Keep accurate stock levels, prevent overselling, optimize turnover',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['products', 'inventory', 'stock', 'management', 'optimization'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './products/inventory-management.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'getting-started/user-roles': {
    slug: 'user-roles',
    category: 'getting-started',
    title: 'Understanding User Roles',
    description: 'Learn about user roles, permissions, and security best practices',
    roles: [], // Public
    tags: ['onboarding', 'users', 'permissions', 'roles', 'security'],
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    filePath: './getting-started/user-roles.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'products/product-images': {
    slug: 'product-images',
    category: 'products',
    title: 'Product Images Guide',
    description: 'High-quality product photography, equipment, editing, and optimization',
    roles: [], // Public
    tags: ['products', 'photography', 'images', 'optimization', 'quality'],
    difficulty: 'beginner',
    estimatedTime: '20 minutes',
    filePath: './products/product-images.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/qr-codes': {
    slug: 'qr-codes',
    category: 'dispensary',
    title: 'QR Code Generation',
    description: 'Generate QR codes for menus, products, promotions, and events',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['dispensary', 'qr-codes', 'marketing', 'contactless', 'tracking'],
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    filePath: './dispensary/qr-codes.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/event-promotion': {
    slug: 'event-promotion',
    category: 'dispensary',
    title: 'Event Promotion',
    description: 'Plan, promote, and measure success for dispensary events and product launches',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['dispensary', 'events', 'marketing', 'promotion', 'community'],
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    filePath: './dispensary/event-promotion.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'marketing/social-media': {
    slug: 'social-media',
    category: 'marketing',
    title: 'Social Media Marketing',
    description: 'Platform-specific strategies, content pillars, and compliance guidelines',
    roles: ['brand', 'super_user'],
    tags: ['marketing', 'social-media', 'instagram', 'content', 'compliance'],
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    filePath: './marketing/social-media.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'integrations/jane': {
    slug: 'jane',
    category: 'integrations',
    title: 'Jane Integration',
    description: 'Connect your Jane account for automatic menu sync and inventory updates',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['integrations', 'pos', 'jane', 'sync', 'setup'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './integrations/jane.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'analytics/customer-insights': {
    slug: 'customer-insights',
    category: 'analytics',
    title: 'Customer Insights',
    description: 'Understand purchasing patterns, RFM segmentation, LTV analysis, and churn',
    roles: ['brand', 'super_user'],
    tags: ['analytics', 'customers', 'rfm', 'ltv', 'segmentation', 'retention'],
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    filePath: './analytics/customer-insights.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'marketing/playbooks': {
    slug: 'playbooks',
    category: 'marketing',
    title: 'Marketing Playbooks',
    description: 'Automate complex marketing workflows with multi-step campaigns',
    roles: ['brand', 'super_user'],
    tags: ['marketing', 'automation', 'playbooks', 'workflows', 'campaigns'],
    difficulty: 'advanced',
    estimatedTime: '25 minutes',
    filePath: './marketing/playbooks.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'analytics/competitive-pricing': {
    slug: 'competitive-pricing',
    category: 'analytics',
    title: 'Competitive Pricing Reports',
    description: 'Understand your competitive position and optimize prices with AI',
    roles: ['brand', 'super_user'],
    tags: ['analytics', 'pricing', 'competition', 'ezal', 'money-mike', 'optimization'],
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    filePath: './analytics/competitive-pricing.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/carousels': {
    slug: 'carousels',
    category: 'dispensary',
    title: 'Creating Product Carousels',
    description: 'Showcase products dynamically with rotating collections and curated displays',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['dispensary', 'carousels', 'products', 'homepage', 'discovery'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './dispensary/carousels.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'getting-started/inbox-guide': {
    slug: 'inbox-guide',
    category: 'getting-started',
    title: 'Navigating the Inbox',
    description: 'Your unified inbox is mission control for AI agent outputs and campaign management. Switch between Inbox and Chat views to match your workflow.',
    roles: [], // Public
    tags: ['onboarding', 'inbox', 'agents', 'campaigns', 'workflow', 'chat', 'views'],
    difficulty: 'beginner',
    estimatedTime: '12 minutes',
    filePath: './getting-started/inbox-guide.mdx',
    lastUpdated: '2026-02-09',
    author: 'BakedBot Team',
  },

  'getting-started/first-login': {
    slug: 'first-login',
    category: 'getting-started',
    title: 'Your First Login',
    description: 'What happens when you first sign in and how to get started quickly',
    roles: [], // Public
    tags: ['onboarding', 'setup', 'quickstart', 'first-time'],
    difficulty: 'beginner',
    estimatedTime: '15 minutes',
    filePath: './getting-started/first-login.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'products/csv-import': {
    slug: 'csv-import',
    category: 'products',
    title: 'Importing Products from CSV',
    description: 'Bulk upload your entire product catalog from a spreadsheet in minutes',
    roles: ['brand', 'super_user'],
    tags: ['products', 'import', 'csv', 'bulk', 'catalog'],
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    filePath: './products/csv-import.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'products/product-descriptions': {
    slug: 'product-descriptions',
    category: 'products',
    title: 'Writing Effective Product Descriptions',
    description: 'Write compelling, compliant copy that converts browsers into buyers',
    roles: [], // Public
    tags: ['products', 'copywriting', 'seo', 'compliance', 'conversion'],
    difficulty: 'beginner',
    estimatedTime: '15 minutes',
    filePath: './products/product-descriptions.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'agents/hive-mind': {
    slug: 'hive-mind',
    category: 'agents',
    title: 'Agent Collaboration (Hive Mind)',
    description: 'How AI agents work together, share insights, and coordinate actions',
    roles: [], // Public
    tags: ['agents', 'collaboration', 'hive-mind', 'coordination', 'ai'],
    difficulty: 'intermediate',
    estimatedTime: '12 minutes',
    filePath: './agents/hive-mind.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'marketing/compliance': {
    slug: 'compliance',
    category: 'marketing',
    title: 'Cannabis Marketing Compliance',
    description: 'Navigate cannabis advertising regulations and stay compliant across channels',
    roles: ['brand', 'super_user'],
    tags: ['marketing', 'compliance', 'regulations', 'legal', 'deebo'],
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    filePath: './marketing/compliance.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'troubleshooting/authentication': {
    slug: 'authentication',
    category: 'troubleshooting',
    title: 'Authentication & Login Issues',
    description: 'Troubleshoot login problems, password resets, and account access issues',
    roles: [], // Public
    tags: ['troubleshooting', 'login', 'authentication', 'password', 'access'],
    difficulty: 'beginner',
    estimatedTime: '8 minutes',
    filePath: './troubleshooting/authentication.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'troubleshooting/contact-support': {
    slug: 'contact-support',
    category: 'troubleshooting',
    title: 'Contacting Support',
    description: 'Get help when you need it - support channels, response times, and what to include',
    roles: [], // Public
    tags: ['troubleshooting', 'support', 'help', 'contact', 'customer-service'],
    difficulty: 'beginner',
    estimatedTime: '8 minutes',
    filePath: './troubleshooting/contact-support.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'dispensary/customer-segmentation': {
    slug: 'customer-segmentation',
    category: 'dispensary',
    title: 'Customer Segmentation',
    description: 'Target the right customers with the right message using advanced segmentation',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['dispensary', 'customers', 'segmentation', 'targeting', 'rfm', 'marketing'],
    difficulty: 'advanced',
    estimatedTime: '20 minutes',
    filePath: './dispensary/customer-segmentation.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'integrations/payment-processing': {
    slug: 'payment-processing',
    category: 'integrations',
    title: 'Payment Processing Setup',
    description: 'Accept payments securely with cannabis-friendly payment processors',
    roles: ['brand', 'super_user', 'dispensary_admin'],
    tags: ['integrations', 'payments', 'checkout', 'processors', 'hypur', 'canpay'],
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    filePath: './integrations/payment-processing.mdx',
    lastUpdated: '2026-02-05',
    author: 'BakedBot Team',
  },

  'marketing/vibe-studio': {
    slug: 'vibe-studio',
    category: 'marketing',
    title: 'Vibe Studio - Menu Theme Generator',
    description: 'Generate AI-powered web and mobile menu themes with our public lead magnet tool',
    roles: [], // Public
    tags: ['marketing', 'vibe-studio', 'themes', 'branding', 'lead-magnet', 'ai', 'mobile', 'web'],
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    filePath: './marketing/vibe-studio.mdx',
    lastUpdated: '2026-02-09',
    author: 'BakedBot Team',
  },

  'dispensary/dynamic-pricing': {
    slug: 'dynamic-pricing',
    category: 'dispensary',
    title: 'Dynamic Pricing Dashboard',
    description: 'Intelligent AI-powered pricing with competitor intelligence, inventory age, and automated POS sync',
    roles: ['super_user', 'dispensary_admin'],
    tags: ['dispensary', 'pricing', 'money-mike', 'ezal', 'alleaves', 'automation', 'competitive-intelligence', 'ai', 'revenue', 'margins'],
    difficulty: 'advanced',
    estimatedTime: '25 minutes',
    filePath: './dispensary/dynamic-pricing.mdx',
    lastUpdated: '2026-02-11',
    author: 'BakedBot Team',
  },

  'agents/intelligence-livehud': {
    slug: 'intelligence-livehud',
    category: 'agents',
    title: 'LiveHud - Agent Cognitive Monitoring',
    description: 'Real-time agent monitoring with personality modes, behavior sliders, and performance metrics',
    roles: ['super_user'],
    tags: ['agents', 'intelligence', 'monitoring', 'personality-modes', 'behavior', 'performance', 'ai'],
    difficulty: 'advanced',
    estimatedTime: '15 minutes',
    filePath: './agents/intelligence-livehud.mdx',
    lastUpdated: '2026-02-11',
    author: 'BakedBot Team',
  },

  'agents/memory-health': {
    slug: 'memory-health',
    category: 'agents',
    title: 'Memory Health & Auto-Gardening',
    description: 'Automated memory maintenance, conflict detection, and quality optimization for AI agents',
    roles: ['super_user'],
    tags: ['agents', 'intelligence', 'memory', 'optimization', 'health', 'automation', 'ai'],
    difficulty: 'advanced',
    estimatedTime: '12 minutes',
    filePath: './agents/memory-health.mdx',
    lastUpdated: '2026-02-11',
    author: 'BakedBot Team',
  },

  'agents/input-safety': {
    slug: 'input-safety',
    category: 'agents',
    title: 'Input Safety & Security',
    description: 'Multi-layer protection against adversarial inputs, prompt injection, and malicious patterns',
    roles: ['super_user'],
    tags: ['agents', 'intelligence', 'security', 'safety', 'adversarial', 'protection', 'ai'],
    difficulty: 'advanced',
    estimatedTime: '10 minutes',
    filePath: './agents/input-safety.mdx',
    lastUpdated: '2026-02-11',
    author: 'BakedBot Team',
  },

  'agents/completeness-doctrine': {
    slug: 'completeness-doctrine',
    category: 'agents',
    title: 'Completeness Doctrine',
    description: 'Ensuring AI agents address all user intents with intent extraction and coverage verification',
    roles: ['super_user'],
    tags: ['agents', 'intelligence', 'completeness', 'intent', 'quality', 'verification', 'ai'],
    difficulty: 'advanced',
    estimatedTime: '10 minutes',
    filePath: './agents/completeness-doctrine.mdx',
    lastUpdated: '2026-02-11',
    author: 'BakedBot Team',
  },

  // 🎉 56 articles complete!
};

/**
 * Get all categories with article counts
 */
export function getCategories(): Array<{ name: string; count: number; label: string }> {
  const categoryCounts: Record<string, number> = {};
  const categoryLabels: Record<string, string> = {
    'getting-started': 'Getting Started',
    products: 'Products',
    agents: 'AI Agents',
    marketing: 'Marketing',
    analytics: 'Analytics',
    dispensary: 'Dispensary Features',
    integrations: 'Integrations',
    troubleshooting: 'Troubleshooting',
  };

  Object.values(articles).forEach((article) => {
    categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
  });

  return Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
    label: categoryLabels[name] || name,
  }));
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  Object.values(articles).forEach((article) => {
    article.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}
