# Supabase Setup for The Connection Room (Phase 1.1)

This guide walks you through setting up Supabase for beta testing. The app will gracefully fall back to demo/local mode if Supabase is not configured.

## Prerequisites

- Supabase account (already have one)
- Vercel project deployed
- GitHub repo connected to Vercel

## Step 1: Create or Access Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. If you don't have a project yet, create one:
   - Click "New Project"
   - Name: "The Connection Room" or similar
   - Choose a database password
   - Select region closest to users (e.g., us-west-1 for California)
3. Wait for project to initialize (~1-2 minutes)

## Step 2: Create Tables and RLS Policies

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_beta_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or Cmd+Enter)
6. Wait for completion (no errors should appear)

This will create:
- `profiles` - User profile data
- `couples_profiles` - Partner profile data
- `spaces` - Community spaces (pre-seeded with 9 spaces)
- `space_memberships` - User's joined spaces
- `posts` - Forum posts and prompt responses
- `comments` - Post comments
- `reactions` - Gentle text reactions
- `reports` - Community concern reports

All tables have Row Level Security (RLS) policies enabled.

## Step 3: Get Your Credentials

In Supabase dashboard:

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (for server-side only)

## Step 4: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Go to **Settings** > **Environment Variables**
3. Add three new variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL = [paste Project URL from Step 3]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [paste anon public key from Step 3]
   SUPABASE_SERVICE_ROLE_KEY = [paste service_role key from Step 3]
   ```

4. **Vercel will redeploy automatically** once you add these

## Step 5: Configure Supabase Auth Redirect URLs

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Click **Email**
3. Scroll to "Redirect URLs"
4. Add these URLs (replace `your-domain.com` with your actual domain):

   **Production:**
   ```
   https://community.trevorjamesla.com/auth/callback
   ```

   **Local development:**
   ```
   http://localhost:3000/auth/callback
   ```

5. Click **Save**

## Step 6: Enable Email Magic Link (Optional)

If you want to use magic link login instead of email/password:

1. In Supabase, go to **Authentication** > **Providers**
2. Make sure **Email** provider is enabled
3. Under **Email Provider Settings**:
   - Enable "Enable email confirmations" if not already
   - Magic links will be sent via email

(The app currently supports both magic link and email/password)

## Step 7: Test Magic Link Locally

1. Run the app locally:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000

3. You should see:
   - **If Supabase is configured**: Real sign-in page with email field
   - **If Supabase is not configured**: Demo sign-in with "Continue as Demo Member"

4. Try signing in with an email:
   - You should receive a magic link email
   - Click the link
   - You'll be redirected to onboarding

## Step 8: Verify Production Deployment

1. Visit https://community.trevorjamesla.com
2. You should see the real sign-in page (not demo)
3. Try signing in with an email
4. Verify you get the magic link email
5. Click the link and complete onboarding

## Troubleshooting

### "Blank screen" or app crashes on load

- Check Vercel environment variables are set
- Check Supabase Project URL and keys are correct
- Redeploy Vercel if you just added env vars
- Check browser console (F12) for errors

### "Email not found" error

- Make sure you're using a valid email address
- Check Supabase email provider is enabled
- Check email redirect URLs are configured in Supabase

### Demo mode is still showing

This is expected if Supabase env variables are missing or invalid. The app gracefully falls back to demo/local mode, so you can test without Supabase configured.

If you want to force beta mode, verify:
- `NEXT_PUBLIC_SUPABASE_URL` is set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- Both are copied exactly from Supabase (no extra spaces)

### "Magic link expired"

Magic links are valid for 24 hours. If expired, go back to sign-in and request a new link.

## Next Steps

Once Supabase is set up:

1. Run the **BETA_TESTING_CHECKLIST.md** to verify everything works
2. Invite beta testers with their email addresses
3. They'll receive magic links and can sign up
4. Their profiles, spaces, and posts will persist in Supabase

## Important Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` should **never** be exposed in client-side code (it is server-side only)
- RLS policies prevent users from reading other users' private data
- Report feature allows users to flag concerning content for review
- Admin panel (Phase 2) will require proper authentication

## More Information

- Supabase Docs: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
