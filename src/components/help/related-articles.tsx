import Link from 'next/link';
import { getRelatedArticles, HelpArticleMeta } from '@/server/actions/help-actions';

export default async function RelatedArticles({
  articleId,
  tags,
  userRole,
}: {
  articleId: string;
  tags: string[];
  userRole?: string;
}) {
  const relatedArticles = await getRelatedArticles(articleId, tags, userRole, 3);

  if (relatedArticles.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-xl font-semibold mb-4">Related Articles</h3>
      <div className="grid gap-4">
        {relatedArticles.map((article) => (
          <Link
            key={`${article.category}-${article.slug}`}
            href={`/help/${article.category}/${article.slug}`}
            className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition"
          >
            <h4 className="font-semibold text-lg mb-1">{article.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{article.description}</p>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span>⏱️</span>
                {article.estimatedTime}
              </span>
              <span className="flex items-center gap-1">
                <span>📊</span>
                <span className="capitalize">{article.difficulty}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
