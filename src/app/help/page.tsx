import Link from 'next/link';
import { getCategories, articles } from '@/content/help/_index';
import HelpSearchEnhanced from '@/components/help/help-search-enhanced';
import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/auth-helpers';

export const metadata = {
  title: 'Help Center | BakedBot',
  description:
    'Get help with BakedBot - AI Commerce OS for the cannabis industry. Browse guides, tutorials, and documentation.',
};

export default async function HelpHomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const categories = getCategories();
  const { category: selectedCategory } = await searchParams;

  // Get user role for search filtering
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  let userRole: string | undefined;

  if (sessionCookie) {
    try {
      const decodedClaims = await verifySessionCookie(sessionCookie);
      userRole = decodedClaims?.role;
    } catch (error) {
      // Not authenticated or session expired
      userRole = undefined;
    }
  }

  // Get articles for selected category or all articles
  const displayArticles = Object.values(articles).filter(
    (article) =>
      !selectedCategory || article.category === selectedCategory
  );

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {selectedCategory
            ? `${
                categories.find((c) => c.name === selectedCategory)?.label
              } Help`
            : 'How can we help you?'}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {selectedCategory
            ? `Browse ${
                categories.find((c) => c.name === selectedCategory)?.label
              } articles and guides`
            : 'Browse our help articles, watch tutorials, and learn how to get the most out of BakedBot'}
        </p>
      </div>

      {/* Enhanced Search */}
      <div className="max-w-4xl mx-auto mb-12">
        <HelpSearchEnhanced userRole={userRole} />
      </div>

      {/* Quick Links - Show only on home, not when category selected */}
      {!selectedCategory && (
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link
            href="/help/getting-started/welcome"
            className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold mb-2">
              Getting Started
            </h3>
            <p className="text-sm text-gray-600">
              New to BakedBot? Start here to learn the basics
            </p>
          </Link>

          <Link
            href="/help/agents/introduction"
            className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI Agents</h3>
            <p className="text-sm text-gray-600">
              Learn how our AI agents help automate your business
            </p>
          </Link>

          <Link
            href="/help/troubleshooting/common-issues"
            className="block p-6 bg-yellow-50 border border-yellow-200 rounded-lg hover:shadow-lg transition"
          >
            <div className="text-3xl mb-3">🔧</div>
            <h3 className="text-lg font-semibold mb-2">
              Troubleshooting
            </h3>
            <p className="text-sm text-gray-600">
              Common issues and how to solve them
            </p>
          </Link>
        </div>
      )}

      {/* Categories Grid - Show only on home */}
      {!selectedCategory && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/help?category=${category.name}`}
                className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {category.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {category.count} article
                      {category.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Articles List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {selectedCategory ? 'Articles' : 'All Articles'}
          </h2>
          {selectedCategory && (
            <Link
              href="/help"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← View all categories
            </Link>
          )}
        </div>

        {displayArticles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No articles found in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayArticles.map((article) => {
              const articleUrl = `/help/${article.category}/${article.slug}`;
              return (
                <Link
                  key={`${article.category}/${article.slug}`}
                  href={articleUrl}
                  className="block p-5 border rounded-lg hover:border-blue-500 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {article.description}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span>⏱️</span>
                          {article.estimatedTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>📊</span>
                          <span className="capitalize">
                            {article.difficulty}
                          </span>
                        </span>
                        {article.roles.length > 0 && (
                          <span className="flex items-center gap-1">
                            <span>🔒</span>
                            Requires login
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-2xl text-gray-300">→</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Support CTA */}
      <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
        <h3 className="text-xl font-semibold mb-2">
          Still need help?
        </h3>
        <p className="text-gray-600 mb-4">
          Can't find what you're looking for? Our support team is here to
          help.
        </p>
        <div className="flex gap-4">
          <a
            href="mailto:support@bakedbot.ai"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Contact Support
          </a>
          <Link
            href="/help/troubleshooting/common-issues"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition"
          >
            View FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
