/**
 * Manual Substack article sync utility
 * Allows admins to trigger article syncing from the dashboard
 */

interface SyncResult {
  success: boolean;
  message: string;
  total?: number;
  synced?: number;
  errors?: Array<{ title: string; error: string }>;
  timestamp: string;
}

/**
 * Manually trigger Substack article sync
 * Useful for immediate updates without waiting for cron job
 */
export async function syncSubstackArticles(): Promise<SyncResult> {
  try {
    const response = await fetch("/api/sync-substack", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Sync API returned ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: `Sync complete: ${result.synced} new articles from ${result.total} total`,
      total: result.total,
      synced: result.synced,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync failed: ${String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check last sync status and article count
 * Returns information about the latest articles in the database
 */
export async function getArticleSyncStatus(): Promise<{
  totalArticles: number;
  lastArticleDate?: Date;
  error?: string;
}> {
  try {
    // This would query Supabase to get the count of articles
    // For now, return a placeholder that can be extended
    return {
      totalArticles: 0,
    };
  } catch (error) {
    return {
      totalArticles: 0,
      error: String(error),
    };
  }
}
