import { redirect } from 'next/navigation';

export default function AndrewsPage() {
  // Set age verification cookie and redirect to verify-age page
  // This should allow the subsequent redirect to WordPress to work
  redirect('/verify-age?age_verified=true&return_to=/andrewsdevelopments');
}