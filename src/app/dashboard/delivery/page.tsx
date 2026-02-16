/**
 * Delivery Management Dashboard
 *
 * Main page for managing deliveries, drivers, zones, and analytics
 * Accessible by dispensary admin roles
 */

import { Metadata } from 'next';
import { DeliveryDashboard } from './components/delivery-dashboard';

export const metadata: Metadata = {
    title: 'Delivery Management | BakedBot',
    description: 'Manage delivery operations, drivers, zones, and analytics',
};

export default function DeliveryPage() {
    return <DeliveryDashboard />;
}
