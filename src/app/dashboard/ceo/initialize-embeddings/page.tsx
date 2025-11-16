
'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { initializeReviewEmbeddings } from './actions';

export default function InitializeEmbeddingsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleInitialize = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await initializeReviewEmbeddings();
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
       <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Search Index</h1>
          <p className="text-muted-foreground">
              Generate vector embeddings for product reviews to power semantic search.
          </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="mb-4">
          This will generate vector embeddings for all products with reviews.
          This process may take several minutes. You should run this after importing new reviews.
        </p>

        <button
          onClick={handleInitialize}
          disabled={isRunning}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Initializing...' : 'Start Indexing'}
        </button>
      </div>

      {isRunning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-blue-800 font-semibold">Processing products...</p>
          </div>
          <p className="text-blue-600 mt-2 text-sm">
            This may take 5-10 minutes. Please wait...
          </p>
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg p-6 ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <h2 className="text-xl font-bold mb-4">
            {result.success ? '✅ Success!' : '❌ Error'}
          </h2>

          {result.success && result.summary && (
            <div className="space-y-2">
              <p>
                <strong>Total Products:</strong> {result.summary.total}
              </p>
              <p className="text-green-700">
                <strong>✅ Successfully Embedded:</strong> {result.summary.successful}
              </p>
              <p className="text-gray-600">
                <strong>⏭️ Skipped:</strong> {result.summary.skipped}
              </p>
              <p className="text-red-600">
                <strong>❌ Failed:</strong> {result.summary.failed}
              </p>
            </div>
          )}

          {result.error && (
            <p className="text-red-700">
              <strong>Error:</strong> {result.error}
            </p>
          )}

          {result.results && result.results.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold">
                View Details
              </summary>
              <div className="mt-2 max-h-96 overflow-y-auto">
                <pre className="text-xs bg-gray-100 p-4 rounded">
                  {JSON.stringify(result.results, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
