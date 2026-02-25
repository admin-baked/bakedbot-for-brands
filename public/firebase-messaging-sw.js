/**
 * Firebase Messaging Service Worker — BakedBot Driver PWA
 *
 * Handles background push notifications when the driver app is not in the foreground.
 * Notifications are sent server-side via Firebase Admin SDK.
 *
 * SETUP NOTE:
 * Replace 'YOUR_FIREBASE_API_KEY' below with the value of NEXT_PUBLIC_FIREBASE_API_KEY
 * from GCP Secret Manager or .env.local. All other values are already configured.
 *
 * The apiKey is intentionally public (NEXT_PUBLIC_ prefix) — it is already
 * embedded in every browser page load and is safe to include here.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config — all public values (NEXT_PUBLIC_ prefix means they're already in browser bundle)
// To get apiKey: gcloud secrets versions access latest --secret=NEXT_PUBLIC_FIREBASE_API_KEY --quiet
firebase.initializeApp({
    apiKey: 'AIzaSyAGUhtFXf_4bblJ5U6soNnEKuT_7YOavos',
    authDomain: 'studio-567050101-bc6e8.firebaseapp.com',
    projectId: 'studio-567050101-bc6e8',
    storageBucket: 'bakedbot-global-assets',
    messagingSenderId: '1016399212569',
    appId: '1:1016399212569:web:d9c43842ea4d824e13ba88',
});

const messaging = firebase.messaging();

// Handle messages received while app is in the background
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'New Delivery Alert';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icons/driver-icon-192.png',
        badge: '/icons/driver-icon-192.png',
        data: payload.data || {},
        actions: [{ action: 'view', title: 'View Delivery' }],
        requireInteraction: true,
        vibrate: [200, 100, 200],
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification tap — open the delivery page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const deliveryId = event.notification.data?.deliveryId;
    const url = deliveryId ? `/driver/delivery/${deliveryId}` : '/driver/dashboard';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('/driver') && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            })
    );
});
