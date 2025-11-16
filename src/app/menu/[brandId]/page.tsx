// This is the new home for the consumer-facing menu.
// It renders the MenuPageClient, which contains all the logic
// for fetching data and deciding which menu layout to show.

import MenuPageClient from '../../menu-page-client';

export default function Page() {
  // All logic is now encapsulated in the client component.
  return <MenuPageClient />;
}
