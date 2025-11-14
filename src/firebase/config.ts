
// src/firebase/config.ts

const getCurrentAuthDomain = () => {
  // Server-side rendering: use default Firebase domain
  if (typeof window === 'undefined') {
    return 'studio-567050101-bc6e8.firebaseapp.com';
  }

  const hostname = window.location.hostname;

  // Cloud Workstation (Firebase Studio) - use the actual hostname
  if (hostname.includes('cloudworkstations.dev')) {
    console.log('🔧 Firebase Config: Using Cloud Workstation hostname for auth');
    return hostname;
  }

  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🔧 Firebase Config: Using Firebase default for localhost');
    return 'studio-567050101-bc6e8.firebaseapp.com';
  }

  // Production
  if (hostname === 'brands.bakedbot.ai') {
    console.log('🔧 Firebase Config: Using custom domain for production');
    return 'brands.bakedbot.ai';
  }

  // Fallback to Firebase default
  return 'studio-567050101-bc6e8.firebaseapp.com';
};

export const firebaseConfig = {
  projectId: "studio-567050101-bc6e8",
  appId: "1:1016399212569:web:d9c43842ea4d824e13ba88",
  apiKey: "AIzaSyASUULiUcdtqVnPrTqZTsxoNiXdFPJ5e7E",
  authDomain: getCurrentAuthDomain(),
  measurementId: "G-B4FT9QTWD1",
  messagingSenderId: "1016399212569"
};
