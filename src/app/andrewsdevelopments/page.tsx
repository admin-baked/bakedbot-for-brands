'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AndrewsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Function to fetch WordPress content
    const fetchWordPress = async () => {
      try {
        const wpUrl = 'https://andrews-wp-lo74oftdza-uc.a.run.app/';
        const response = await fetch(wpUrl, {
          headers: {
            'Host': 'andrews-wp-lo74oftdza-uc.a.run.app',
          },
        });

        if (response.ok) {
          const html = await response.text();
          // Create a new document with WordPress content
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          // Replace current document with WordPress content
          document.documentElement.innerHTML = doc.documentElement.innerHTML;
          setIsLoading(false);
        } else {
          throw new Error('Failed to fetch WordPress');
        }
      } catch (error) {
        console.error('Error fetching WordPress:', error);
        router.push('/verify-age');
      }
    };

    fetchWordPress();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading Andrews Developments...</h1>
        <p>Please wait while we load the WordPress site.</p>
      </div>
    );
  }

  return null; // Content is injected into the document
}