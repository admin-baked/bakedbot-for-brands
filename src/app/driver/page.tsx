import { redirect } from 'next/navigation';

/**
 * Driver root page — redirects to login.
 * /driver has no UI; drivers always land at /driver/login first.
 */
export default function DriverIndexPage() {
    redirect('/driver/login');
}
