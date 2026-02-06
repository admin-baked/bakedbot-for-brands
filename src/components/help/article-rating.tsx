'use client';

import { useState } from 'react';
import { rateArticle } from '@/server/actions/help-actions';

export default function ArticleRating({
  articleId,
  userId,
}: {
  articleId: string;
  userId?: string;
}) {
  const [rating, setRating] = useState<'helpful' | 'not-helpful' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRating = async (helpful: boolean) => {
    if (!userId) {
      setError('Please sign in to rate articles');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await rateArticle(articleId, helpful, userId);
      setRating(helpful ? 'helpful' : 'not-helpful');
    } catch (err) {
      setError('Failed to save rating. Please try again.');
      console.error('Rating error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (rating) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-green-800">
          <span className="text-2xl">✓</span>
          <span className="font-medium">
            {rating === 'helpful'
              ? 'Thanks for your feedback!'
              : 'Thanks! We\'ll work on improving this article.'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-2">Was this helpful?</h3>
      <p className="text-sm text-gray-600 mb-4">
        {userId
          ? 'Let us know so we can improve our documentation.'
          : 'Sign in to rate articles and help us improve.'}
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => handleRating(true)}
          disabled={loading || !userId}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <span>👍</span>
          <span>Yes, helpful</span>
        </button>
        <button
          onClick={() => handleRating(false)}
          disabled={loading || !userId}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <span>👎</span>
          <span>Not helpful</span>
        </button>
      </div>

      {!userId && (
        <p className="mt-4 text-xs text-gray-500">
          <a href="/login" className="text-blue-600 hover:text-blue-800 underline">
            Sign in
          </a>{' '}
          to rate this article
        </p>
      )}
    </div>
  );
}
