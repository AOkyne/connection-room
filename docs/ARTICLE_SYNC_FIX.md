# Article Sync Fix - v1.3.1

## Problem

The "From My Writing" section on the dashboard was not updating with the latest Substack articles. It continued showing last week's article even after new articles were published.

## Root Cause

The Substack sync API endpoint (`/api/sync-substack`) existed but was never being called automatically. There was no cron job or scheduled task to trigger the sync.

## Solution

Implemented automatic daily article syncing with three components:

### 1. Cron Job Endpoint
**File**: `app/api/cron/sync-substack/route.ts`

- Triggers daily at **8 AM UTC** (configured in `vercel.json`)
- Calls the sync API and logs results
- Includes authorization via `CRON_SECRET` environment variable
- Works on Vercel's serverless platform

**Vercel Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-substack",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### 2. Admin Utility
**File**: `lib/admin/sync-articles.ts`

Provides a client-side function to manually trigger syncs:
```typescript
import { syncSubstackArticles } from "@/lib/admin/sync-articles";

const result = await syncSubstackArticles();
// { success: true, message: "...", total: 5, synced: 2, timestamp: "..." }
```

### 3. Admin Dashboard
**File**: `app/admin/sync-articles/page.tsx`

Accessible at `/admin/sync-articles`, provides:
- Manual sync button for immediate updates
- Status display showing total and newly synced articles
- Error reporting
- Information about the automatic sync schedule
- Troubleshooting guide

## How to Use

### For Daily Automatic Syncing

The cron job will run automatically on Vercel at 8 AM UTC daily. No additional setup needed.

**To enable**: Ensure `CRON_SECRET` is set in your production environment:
```bash
# Generate a secure token
openssl rand -hex 32

# Add to .env.production or Vercel dashboard:
CRON_SECRET=<generated-token>
```

### For Manual Syncing

1. Navigate to **`/admin/sync-articles`** in the dashboard
2. Click **"Sync Articles Now"**
3. Wait for the sync to complete
4. Results show how many new articles were found and synced

### For Development/Testing

Manually trigger the sync:
```typescript
import { syncSubstackArticles } from "@/lib/admin/sync-articles";

// In a client component or server action
const result = await syncSubstackArticles();
console.log(result);
```

Or via API (no auth required in dev):
```bash
curl -X POST http://localhost:3000/api/sync-substack
```

## How It Works

1. **Cron Job** (8 AM UTC) → Calls `/api/cron/sync-substack`
2. **Sync Endpoint** → Fetches Substack RSS feed
3. **RSS Parser** → Extracts articles from XML
4. **Deduplication** → Checks if article URL already exists
5. **Database Insert** → Adds new articles to Supabase
6. **Dashboard** → `getNewestArticle()` returns the newest synced article

## Troubleshooting

### Articles still showing old dates

- Check if the sync completed successfully by going to `/admin/sync-articles`
- Verify Substack feed is accessible: https://trevorjamesla.substack.com/feed
- Check browser cache (hard refresh with Cmd+Shift+R or Ctrl+Shift+R)

### Sync failing with errors

- Verify `CRON_SECRET` is set correctly in Vercel
- Check that Substack RSS feed URL is correct
- Review logs in Vercel dashboard under "Cron Jobs"

### Manual sync not working

- Ensure you're on the `/admin/sync-articles` page
- Check browser console for errors
- Verify network request to `/api/sync-substack` completes

## Performance

- **Sync time**: ~2-5 seconds (fetches feed, parses, inserts to DB)
- **Frequency**: Daily at 8 AM UTC
- **Storage**: Articles are stored in Supabase `articles` table
- **Caching**: No client-side caching; always fetches latest from database

## Future Enhancements

- [ ] Email notification when new article is synced
- [ ] Webhook to trigger sync on Substack publish
- [ ] Article preview and scheduling
- [ ] Multi-language article support
- [ ] Reading time estimation
- [ ] Social media sharing optimization

## Related Files

- `app/api/sync-substack/route.ts` — Main sync logic
- `app/api/cron/sync-substack/route.ts` — Cron trigger
- `lib/admin/sync-articles.ts` — Admin utilities
- `app/admin/sync-articles/page.tsx` — Admin dashboard
- `lib/data/articles.ts` — Article data layer
- `vercel.json` — Cron configuration

## Environment Variables

```bash
# Required for production cron
CRON_SECRET=<secure-random-token>

# Already configured
NEXT_PUBLIC_APP_URL=https://community.trevorjamesla.com
NEXT_PUBLIC_SUPABASE_URL=<your-url>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
```

---

**Status**: ✅ Implemented and ready for production
**Last Updated**: 2026-07-14
