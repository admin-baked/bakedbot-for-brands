// This is the new, clean entry point for the main application route.
// It renders the MenuPageClient, which now contains all the logic
// for fetching data and deciding which menu layout to show.
// This adheres to the pattern of using a client component for dynamic,
// state-driven UI while keeping the root page clean.

import MenuPageClient from './menu-page-client';

export default function Page() {
  // All logic is now encapsulated in the client component.
  return <MenuPageClient />;
}
