
// src/firebase/config.ts

const getCurrentAuthDomain = () => {
  // Server-side rendering: use default Firebase domain
  if (typeof window === 'undefined') {
    return 'studio-567050101-bc6e8.firebaseapp.com';
  }

  const hostname = window.location.hostname;

  // Production only - use custom domain
  if (hostname === 'brands.bakedbot.ai') {
    console.log('🔧 Firebase Config: Using custom domain for production');
    return 'brands.bakedbot.ai';
  }

  // ✅ All development environments (Cloud Workstation, localhost, etc.)
  // Use Firebase default domain which has the auth handler
  console.log('🔧 Firebase Config: Using Firebase default for development');
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
