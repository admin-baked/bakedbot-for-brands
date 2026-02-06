import { ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { getCategories } from '@/content/help/_index';

async function getUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (sessionCookie) {
      const { auth } = await createServerClient();
      const decodedClaims = await auth.verifySessionCookie(sessionCookie);
      return {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        role:
          (decodedClaims.role as string) ||
          (decodedClaims.userRole as string) ||
          'customer',
      };
    }
  } catch (error) {
    // User not authenticated
  }
  return null;
}

export default async function HelpLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  const categories = getCategories();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/help" className="flex items-center gap-2">
                <span className="text-2xl">🌿</span>
                <h1 className="text-2xl font-bold">BakedBot Help</h1>
              </Link>

              {/* Search placeholder - will be enhanced later */}
              <div className="hidden md:block">
                <input
                  type="search"
                  placeholder="Search help articles..."
                  className="w-96 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ← Back to Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <nav className="bg-white rounded-lg border p-4 sticky top-24">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">
                Categories
              </h2>
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category.name}>
                    <Link
                      href={`/help?category=${category.name}`}
                      className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                    >
                      <div className="flex justify-between items-center">
                        <span>{category.label}</span>
                        <span className="text-xs text-gray-400">
                          {category.count}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t">
                <h3 className="text-sm font-semibold mb-3">Need More Help?</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="mailto:support@bakedbot.ai"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      📧 Email Support
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/help/troubleshooting/common-issues"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      🔧 Troubleshooting
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </aside>

          {/* Article Content */}
          <main className="flex-1 bg-white rounded-lg border p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <p>© 2026 BakedBot AI. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="https://bakedbot.ai" className="hover:text-gray-900">
                bakedbot.ai
              </a>
              <a href="/help" className="hover:text-gray-900">
                Help Center
              </a>
              <a
                href="mailto:support@bakedbot.ai"
                className="hover:text-gray-900"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
