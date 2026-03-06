import { redirect } from 'next/navigation';

export default function AndrewsPage() {
  // Direct redirect to WordPress Cloud Run service
  // This bypasses Next.js entirely and goes straight to WordPress
  redirect('https://andrews-wp-lo74oftdza-uc.a.run.app/');
}