import { notFound, redirect } from 'next/navigation';
import {
  getArticleBySlug,
  trackArticleView,
} from '@/server/actions/help-actions';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { components } from '@/components/mdx';
import ArticleRating from '@/components/help/article-rating';
import RelatedArticles from '@/components/help/related-articles';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const article = await getArticleBySlug(params.category, params.slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: `${article.title} | BakedBot Help`,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  // Get article
  const article = await getArticleBySlug(params.category, params.slug);

  if (!article) {
    notFound();
  }

  // Check authentication and role-based access
  let user = null;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (sessionCookie) {
      const { auth } = await createServerClient();
      const decodedClaims = await auth.verifySessionCookie(sessionCookie);
      user = {
        uid: decodedClaims.uid,
        role:
          (decodedClaims.role as string) ||
          (decodedClaims.userRole as string) ||
          'customer',
      };
    }
  } catch (error) {
    // User not authenticated
  }

  // Check role permissions
  if (article.roles.length > 0) {
    if (!user) {
      redirect(
        `/login?redirect=/help/${params.category}/${params.slug}`
      );
    }

    if (!article.roles.includes(user.role)) {
      return (
        <div className="max-w-4xl mx-auto py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
            <p className="text-gray-700">
              This article is only available to: {article.roles.join(', ')}
            </p>
            <p className="text-sm text-gray-600 mt-4">
              Your current role: <strong>{user.role}</strong>
            </p>
          </div>
        </div>
      );
    }
  }

  // Track view
  await trackArticleView(
    `${params.category}/${params.slug}`,
    user?.uid
  );

  return (
    <article className="max-w-4xl mx-auto">
      {/* Article Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <a href="/help" className="hover:text-gray-700">
            Help Center
          </a>
          <span>/</span>
          <a
            href={`/help?category=${params.category}`}
            className="hover:text-gray-700 capitalize"
          >
            {params.category.replace(/-/g, ' ')}
          </a>
          <span>/</span>
          <span>{article.title}</span>
        </div>

        <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
        <p className="text-xl text-gray-600 mb-6">{article.description}</p>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <span>⏱️</span>
            <span>{article.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📊</span>
            <span className="capitalize">{article.difficulty}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📅</span>
            <span>
              Updated {new Date(article.lastUpdated).toLocaleDateString()}
            </span>
          </div>
          {article.views > 0 && (
            <div className="flex items-center gap-1">
              <span>👁️</span>
              <span>{article.views} views</span>
            </div>
          )}
        </div>
      </div>

      {/* Article Content */}
      <div className="prose prose-lg max-w-none">
        <MDXRemote
          source={article.content}
          components={components}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [rehypeHighlight],
            },
          }}
        />
      </div>

      {/* Article Footer */}
      <div className="mt-12 pt-8 border-t">
        <ArticleRating
          articleId={`${params.category}/${params.slug}`}
          userId={user?.uid}
        />
      </div>

      {/* Related Articles */}
      <RelatedArticles
        articleId={`${params.category}--${params.slug}`}
        tags={article.tags}
        userRole={user?.role}
      />
    </article>
  );
}
