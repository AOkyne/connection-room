"use client";

import { useState } from "react";
import Link from "next/link";
import { syncSubstackArticles } from "@/lib/admin/sync-articles";

export default function SyncArticlesAdmin() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const syncResult = await syncSubstackArticles();
      setResult(syncResult);

      if (!syncResult.success) {
        setError(syncResult.message);
      }
    } catch (err) {
      setError(`Failed to sync: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-[#c97a2a] hover:text-[#1a0f0a] mb-4 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-[#1a0f0a] mb-2">
            Sync Substack Articles
          </h1>
          <p className="text-[#a0704a]">
            Manually sync the latest articles from Substack to the dashboard
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-lg border border-[#e8ddd2] p-6 mb-8 space-y-4">
          <div>
            <h3 className="font-semibold text-[#1a0f0a] mb-2">
              About Article Sync
            </h3>
            <ul className="text-sm text-[#4a3e33] space-y-1 list-disc list-inside">
              <li>Syncs from Substack RSS feed: trevorjamesla.substack.com/feed</li>
              <li>Automatic daily sync at 8 AM UTC (via Vercel Cron)</li>
              <li>Duplicates are skipped automatically</li>
              <li>Use this button for immediate updates</li>
            </ul>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
            isLoading
              ? "bg-[#d4a348] text-white cursor-not-allowed opacity-75"
              : "bg-[#c97a2a] text-white hover:bg-[#a85a1a]"
          }`}
        >
          {isLoading ? "Syncing..." : "Sync Articles Now"}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-semibold">Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {result && result.success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <p className="text-sm text-green-700 font-semibold">✓ Sync Complete</p>
            <div className="text-sm text-green-600 space-y-1">
              <p><strong>Total articles found:</strong> {result.total}</p>
              <p><strong>New articles synced:</strong> {result.synced}</p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="font-semibold mb-2">Errors ({result.errors.length}):</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    {result.errors.map((err: any, i: number) => (
                      <li key={i}>{err.title}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-xs text-green-500 mt-3">
              Synced at {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 p-6 bg-[#f8f6f2] rounded-lg border border-[#e8ddd2]">
          <h3 className="font-semibold text-[#1a0f0a] mb-3">
            Troubleshooting
          </h3>
          <div className="text-sm text-[#4a3e33] space-y-2">
            <p>
              <strong>Articles not updating?</strong> The cron job runs daily at 8 AM UTC. Use this button to sync immediately.
            </p>
            <p>
              <strong>Duplicate articles?</strong> Each article is checked by URL before inserting. Duplicates are skipped.
            </p>
            <p>
              <strong>Feed not loading?</strong> Check that the Substack RSS feed is accessible and contains articles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
