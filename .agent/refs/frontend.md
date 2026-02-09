# Frontend Reference

## Overview
BakedBot uses Next.js App Router with ShadCN UI components and Tailwind CSS.

---

## Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Public marketing pages
│   ├── dashboard/            # Protected dashboards (50 subdirs)
│   ├── embed/                # Embeddable components (iframe)
│   │   └── menu/[brandId]/   # Menu embed for external sites
│   ├── claim/                # Claim flow
│   ├── login/                # Auth pages
│   └── api/                  # API routes
├── components/               # React components
│   ├── ui/                   # ShadCN primitives (44 files)
│   ├── chat/                 # Agent chat components
│   ├── dashboard/            # Dashboard widgets
│   ├── landing/              # Homepage sections
│   └── auth/                 # Login/signup
├── embed/                    # External embed scripts
│   ├── index.tsx             # Chatbot embed entry
│   ├── locator.tsx           # Store locator embed
│   └── menu.tsx              # Menu embed entry
└── hooks/                    # Custom React hooks
    ├── use-mobile.tsx        # Viewport detection
    └── use-user.tsx          # Auth context
```

---

## Component Architecture

### ShadCN UI (Radix)
**Location**: `src/components/ui/`

Core primitives from ShadCN. Do NOT modify directly.

```
ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── input.tsx
├── select.tsx
├── sheet.tsx
├── tabs.tsx
├── toast.tsx
└── ... (44 total)
```

### Custom Components
Organized by feature domain:

| Directory | Purpose |
|-----------|---------|
| `chat/` | Agent chat, thinking window, carousel |
| `dashboard/` | Widgets, sidebar, navigation |
| `landing/` | Homepage sections, typewriter |
| `checkout/` | Cart, payment forms |
| `auth/` | Login, signup, verification |

---

## Key Components

### PuffChat (Agent Interface)
**File**: `src/app/dashboard/ceo/components/puff-chat.tsx`

Main agent chat component. Handles:
- Message streaming
- Tool calls visualization
- Typewriter effect (desktop)
- Carousel (mobile)
- Discovery bar

### Typewriter Text
**File**: `src/components/landing/typewriter-text.tsx`

Claude-style text animation for agent responses.

```typescript
<TypewriterText 
  text={response} 
  speed={15} 
  onComplete={handleComplete}
/>
```

### Agent Response Carousel
**File**: `src/components/chat/agent-response-carousel.tsx`

Mobile-optimized swipeable cards for structured content.

### Thinking Window
**File**: `src/components/chat/thinking-window.tsx`

Displays agent reasoning steps with terminal aesthetic.

### Unified Inbox
**Files**:
- `src/components/inbox/unified-inbox.tsx` - Main inbox container
- `src/components/inbox/inbox-sidebar.tsx` - Thread list sidebar
- `src/components/inbox/inbox-conversation.tsx` - Message view
- `src/components/inbox/inbox-artifact-panel.tsx` - Artifact preview panel

Thread-based workspace that consolidates Carousels, Bundles, and Creative Center.

**Features**:
- Multi-agent conversations with thread organization
- Inline artifact creation and preview
- Filter by type, status, agent, or project
- Persistent state via Zustand

**Store**: `src/lib/store/inbox-store.ts`
```typescript
import { useInboxStore } from '@/lib/store/inbox-store';

// Create a new thread
const createThread = useInboxStore(state => state.createThread);
const thread = createThread('carousel', {
  title: 'Summer Campaign',
  initialMessage: message
});

// Get filtered threads
const threads = useInboxStore(state => state.getFilteredThreads());
```

### Inbox View Toggle
**File**: `src/components/inbox/inbox-view-toggle.tsx`

Allows users to switch between Unified Inbox and Traditional Agent Chat views.

**View Modes**:
- `'inbox'` (default) - Thread-based conversations with artifacts
- `'chat'` - Traditional PuffChat experience

**Persistence**: User preference stored in localStorage via Zustand persist middleware.

**Usage**:
```typescript
import { InboxViewToggle } from '@/components/inbox';
import { useInboxStore } from '@/lib/store/inbox-store';

// In your component
<InboxViewToggle />

// Read current view mode
const viewMode = useInboxStore(state => state.viewMode);

// Programmatically change view
const setViewMode = useInboxStore(state => state.setViewMode);
setViewMode('chat'); // or 'inbox'
```

**Implementation**: See `/dashboard/inbox/page.tsx` for conditional rendering based on viewMode.

---

## Styling

### Tailwind CSS
Global config: `tailwind.config.ts`

```typescript
// Common patterns
className="bg-background text-foreground"
className="rounded-lg border shadow-sm"
className="flex items-center gap-2"
```

### Dark Mode
Uses `next-themes` with CSS variables.

```typescript
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
```

### Responsive Breakpoints
```typescript
// Tailwind breakpoints
sm: 640px
md: 768px   // Mobile breakpoint
lg: 1024px
xl: 1280px
```

### Viewport Detection
**File**: `src/hooks/use-mobile.tsx`

```typescript
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile(); // true if < 768px
```

---

## Layout Patterns

### Dashboard Layout
**File**: `src/app/dashboard/layout.tsx`

Provides sidebar, header, and main content area.

```typescript
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

### Page Pattern
```typescript
// Server component
export default async function MyPage() {
  const data = await fetchData();
  return <MyPageClient data={data} />;
}

// Client component
'use client';
export function MyPageClient({ data }) {
  // ... interactive logic
}
```

---

## State Management

### Zustand Stores
**Location**: `src/lib/store/`

```typescript
import { useAgentChatStore } from '@/lib/store/agent-chat-store';

const { messages, addMessage } = useAgentChatStore();
```

### React Query
For server state caching and mutations.

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
```

---

## Animation

### Framer Motion
Used for transitions and micro-animations.

```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

## Menu Embed (Headless Menu)

**Location**: `src/app/embed/menu/[brandId]/`

iframe-based embeddable menu widget for external sites.

### Features
- Complete CSS/JS isolation via iframe
- Product grid with categories and search
- In-iframe cart and checkout
- PostMessage API for parent communication
- Responsive layout options

### Usage
```html
<iframe
  src="https://bakedbot.ai/embed/menu/YOUR_BRAND_ID?layout=grid&showCart=true"
  width="100%"
  height="600"
  frameborder="0"
  allow="payment"
></iframe>
```

### PostMessage Events
| Event | Direction | Purpose |
|-------|-----------|---------|
| `bakedbot:cart:updated` | To parent | Cart state changed |
| `bakedbot:checkout:start` | To parent | User clicked checkout |
| `bakedbot:checkout:complete` | To parent | Order completed |
| `bakedbot:resize` | To parent | Content height changed |
| `bakedbot:config` | From parent | Configuration update |

### URL Parameters
| Param | Values | Default |
|-------|--------|---------|
| `layout` | grid, list, compact | grid |
| `showCart` | true, false | true |
| `showCategories` | true, false | true |
| `width` | CSS value | 100% |
| `height` | CSS value | 600px |

### Key Files
| File | Purpose |
|------|---------|
| `src/app/embed/menu/[brandId]/page.tsx` | Server component |
| `src/app/embed/menu/[brandId]/embed-menu-client.tsx` | Client component |
| `src/app/embed/menu/[brandId]/layout.tsx` | Minimal layout |
| `src/embed/menu.tsx` | External script entry |

### Note on SEO
Menu embeds render in iframes and do NOT provide SEO benefits to host sites. For SEO, brands should use custom domains.

---

## Related Files
- `src/components/ui/` — ShadCN primitives
- `src/hooks/` — Custom hooks
- `tailwind.config.ts` — Tailwind configuration
- `src/app/globals.css` — Global styles
