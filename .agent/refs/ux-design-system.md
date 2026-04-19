# UX Design System Reference

> For BakedBot's Next.js + ShadCN + Tailwind stack. Used by the `ux` builder agent.

---

## Component Hierarchy (Atomic Design)

| Level | Examples in BakedBot |
|-------|----------------------|
| Atoms | Button, Input, Badge, Icon, Label |
| Molecules | FormField, SearchBar, Card, ListItem |
| Organisms | DataTable, Modal, Header, AgentCard |
| Templates | DashboardLayout, AuthLayout |

**Rule:** No business logic in components. Server actions handle mutations.

---

## Component Checklist (run before marking FE done)

- [ ] ShadCN component used where one exists — no custom reimplementations
- [ ] All states handled: hover, active, focus, disabled, loading, empty, error
- [ ] Keyboard nav works — visible focus ring present
- [ ] Touch target ≥ 44×44px on mobile
- [ ] Mobile breakpoints tested: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- [ ] No hardcoded colors or spacing — Tailwind tokens only
- [ ] TypeScript props typed — no implicit `any`

---

## Variant Patterns (Tailwind)

```tsx
// Size variants
const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-5 text-lg',
}

// State variants
const states = {
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
  loading:  'cursor-wait pointer-events-none',
  focus:    'focus:outline-none focus:ring-2 focus:ring-primary/50',
}
```

---

## Responsive Breakpoints

| Tailwind prefix | Min width | Target |
|-----------------|-----------|--------|
| (none) | 0 | Mobile base |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |

**Fluid typography pattern:**
```css
/* When Tailwind classes aren't enough */
font-size: clamp(1rem, 0.95rem + 0.2vw, 1.125rem);
```

---

## Accessibility (WCAG AA minimum)

- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- All interactive elements reachable by keyboard
- ARIA attributes on non-semantic elements
- Screen reader text for icon-only buttons: `<span className="sr-only">`
- `aria-live` regions for dynamic content updates (toast, status)

---

## Tailwind → Token mapping

| Purpose | Tailwind class pattern |
|---------|------------------------|
| Primary action | `bg-primary text-primary-foreground` |
| Muted / secondary | `bg-muted text-muted-foreground` |
| Destructive | `bg-destructive text-destructive-foreground` |
| Card surface | `bg-card text-card-foreground` |
| Border | `border border-border` |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-ring` |

*These map to ShadCN's CSS variable system — never hardcode hex values.*
