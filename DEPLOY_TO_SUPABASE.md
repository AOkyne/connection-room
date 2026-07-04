# Deploy Chat Migration to Supabase

**Goal:** Activate Supabase persistence for connection messages (Option B)

---

## Method 1: Supabase Web Dashboard (Easiest)

### Step 1: Open Supabase Studio
- Go to: https://app.supabase.com
- Log in with your account
- Select your project

### Step 2: Navigate to SQL Editor
- Left sidebar → "SQL Editor"
- Click "+ New query"

### Step 3: Copy & Paste the Migration
1. Open this file: `supabase/migrations/010_add_connection_messages_and_requests.sql`
2. Copy all the SQL code
3. Paste into the Supabase SQL Editor
4. Click "RUN" button

### Step 4: Verify Success
You should see green checkmarks and messages like:
```
CREATE TABLE IF NOT EXISTS connection_requests
✓ Success
CREATE TABLE IF NOT EXISTS connections
✓ Success
CREATE TABLE IF NOT EXISTS connection_messages
✓ Success
CREATE TABLE IF NOT EXISTS connection_preferences
✓ Success
ALTER TABLE ... ENABLE ROW LEVEL SECURITY
✓ Success
CREATE POLICY ...
✓ Success
CREATE INDEX ...
✓ Success
```

---

## Method 2: Using Supabase CLI (if installed)

```bash
# Install if you don't have it
npm install -g supabase

# Link to your project
supabase link --project-ref diwfbjufjmurvwnccrio

# Push the migration
supabase db push supabase/migrations/010_add_connection_messages_and_requests.sql
```

---

## Method 3: Using Node Script (if Method 1 doesn't work)

```bash
# Install dotenv
npm install dotenv

# Run the migration script
node scripts/deploy-migration.js
```

---

## Verify the Deployment

### In Supabase Studio:

1. **Check Tables Created:**
   - Left sidebar → "Table Editor"
   - You should see these new tables:
     - `connection_requests`
     - `connections`
     - `connection_messages`
     - `connection_preferences`

2. **Check Indexes:**
   - Each table should have indexes (visible in column list)

3. **Check RLS is Enabled:**
   - Click each table
   - Scroll to "Security Policies"
   - Should see policies like:
     - "Users can view their connection requests"
     - "Connection participants can read messages"
     - etc.

### In Your App:

1. Refresh `http://localhost:3000`
2. Go to Connections page
3. Send a message
4. In browser DevTools → Network tab, you should see:
   - `POST` to `/rest/v1/connection_messages`
   - Response with message ID

5. Back in Supabase Studio:
   - Go to Table Editor → `connection_messages`
   - You should see your test message!

---

## What Happens After Deployment

### Before (localStorage):
```
Send Message → messages.ts → Try Supabase (fails) → Fall back to localStorage
```

### After (Supabase):
```
Send Message → messages.ts → Supabase ✓ → Database stored
```

### Benefits:
- ✅ Messages sync across all your devices
- ✅ Persistent storage (not lost on cache clear)
- ✅ Real-time ready for Phase 3
- ✅ Secure with RLS policies

---

## Troubleshooting

### Error: "Table already exists"
This is fine - the migration includes `IF NOT EXISTS` clauses, so it's idempotent.

### Error: "Permission denied" or "role doesn't exist"
- Make sure you're logged in as project owner
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct
- Might need to wait a minute and retry

### Tables created but no messages appear
- Check browser console for errors (DevTools → Console)
- Verify Supabase tables exist and are empty
- Messages.ts might still falling back to localStorage

### Messages disappeared
Means localStorage was cleared. Messages now stored in Supabase database instead.

---

## Rollback (if needed)

If something goes wrong, you can delete tables:

```sql
DROP TABLE IF EXISTS connection_messages CASCADE;
DROP TABLE IF EXISTS connection_requests CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS connection_preferences CASCADE;
```

Then messages will fall back to localStorage automatically.

---

## After Deployment

✅ **Chat messages now persistent across devices**
✅ **Ready for real testing with multiple users**
✅ **Phase 2 complete**

**Next:** Test sending messages and verify they appear in Supabase.

---

## Your Supabase Details

- **URL:** https://diwfbjufjmurvwnccrio.supabase.co
- **Project ID:** diwfbjufjmurvwnccrio
- **Status:** Ready for migration

**Go deploy it!**
