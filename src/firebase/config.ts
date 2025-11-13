
// src/firebase/config.ts

const getCurrentAuthDomain = () => {
  // Server-side rendering: use Firebase default
  if (typeof window === 'undefined') {
    return 'studio-567050101-bc6e8.firebaseapp.com';
  }

  const hostname = window.location.hostname;

  // Production only: use custom domain
  if (hostname === 'brands.bakedbot.ai') {
    return 'brands.bakedbot.ai';
  }

  // All dev environments: use Firebase default domain
  // (Cloud Workstation, localhost, preview URLs, etc.)
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

// Optional: Debug logging (you can remove this after confirming it works)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 Firebase Auth Domain:', firebaseConfig.authDomain);
  console.log('🌐 Current Hostname:', window.location.hostname);
}
