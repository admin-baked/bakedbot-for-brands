import { redirect } from 'next/navigation';

// This page will be caught by the rewrites in next.config.js
// and redirected to the WordPress site
export default function AndrewsPage() {
  return null; // The rewrites will handle the redirect
}