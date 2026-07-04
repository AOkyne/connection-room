# Chat Feature - Quick Start & Testing

## What We Just Fixed

✅ **Critical Bug Fix:** Accepted connections now persist across page refreshes
- Added `getAcceptedConnections()` function
- Connections page loads active chats on mount
- Users can resume chats after browser refresh

✅ **Database Ready:** Migration 010 created with full schema
- `connection_messages` table for persistent storage
- `connection_requests` table for request management  
- `connections` table for active connections
- `connection_preferences` table for user settings
- Complete RLS policies for security

✅ **Demo Mode Ready:** Chat works with localStorage
- Messages persist within browser session
- No Supabase needed for beta testing
- Fallback mechanism if backend unavailable

---

## How to Test the Chat Feature

### Quick Test (5 minutes)

1. **Start the app:** `npm run dev` (already running on http://localhost:3000)

2. **Sign in to demo mode** (one of these):
   - Demo account: `demo@connection.room` / `Demo123!`
   - Test account: `test@connection.room` / `Test123!`
   - Admin: Secret key `connection2024`

3. **Get to Connections page:**
   - After onboarding → Go to "Connections" in navigation
   - Or directly: `/app/connections`

4. **Send/Accept a connection request:**
   - Browse "Suggested Connections" 
   - Click profile → "Request Connection"
   - OR wait for incoming requests and click "Accept"

5. **Open the chat:**
   - Look for "Active Conversations" section
   - Click "Open Chat" on accepted connection
   - Type a message → click "Send"

6. **Verify persistence:**
   - Send 2-3 messages
   - Refresh page (Cmd+R)
   - **Expected:** Messages still there ✓

### Desktop Testing Checklist

- [ ] Messages display with sender name
- [ ] My messages appear on right (gold), partner on left (gray)
- [ ] Timestamps are readable (e.g., "2:45 PM")
- [ ] Timer button works (Start → counts up → Stop)
- [ ] Messages persist after page refresh
- [ ] No console errors (Open DevTools → Console)
- [ ] Can send message with special characters (emoji, quotes)
- [ ] Input field clears after sending

### Mobile Testing Checklist

- [ ] Chat fits on screen without horizontal scroll
- [ ] Timer button is easy to tap (not too small)
- [ ] Input field is accessible and keyboard appears
- [ ] Messages auto-scroll to newest
- [ ] No layout jumps when keyboard opens/closes
- [ ] Timestamps visible (not cut off)
- [ ] Send button enabled when text present

---

## Files Modified

**Bug Fixes:**
- `lib/data/connectionRequests.ts` — Added `getAcceptedConnections()`
- `app/app/connections/page.tsx` — Load accepted connections on mount

**New Files:**
- `supabase/migrations/010_add_connection_messages_and_requests.sql` — DB schema
- `CHAT_FEATURE_VERIFICATION.md` — Complete testing guide
- `CHAT_QUICK_START.md` — This file

---

## What's Working

### Demo Mode (Current - beta ready)
- ✅ Send/receive messages
- ✅ Display formatting (sender/timestamp)
- ✅ 20-minute timer
- ✅ Message persistence (browser session)
- ✅ Auto-scroll to newest
- ✅ Error handling & fallback

### Ready for Phase 2
- ✅ Database schema (migration 010)
- ✅ RLS policies defined
- ✅ Data layer supports Supabase queries
- ✅ Just needs: `supabase db push` to apply

---

## Troubleshooting

### Messages not persisting
- **Cause:** Browser cache cleared
- **Solution:** Messages stored in localStorage; clearing cache removes them
- **For Phase 2:** Apply migration 010 to Supabase for persistent storage

### Timer not working
- **Cause:** Rare browser timing issue
- **Solution:** Refresh page and restart timer
- **Note:** Timer is client-side only, doesn't sync across devices (yet)

### Chat doesn't open
- **Cause:** No accepted connections yet
- **Solution:** 
  1. Go to "Suggested Connections"
  2. Click profile → "Request Connection"
  3. Wait for them to accept (or accept incoming requests)
  4. Then "Open Chat" appears

### See blank page
- **Cause:** Still loading or Supabase timeout
- **Solution:** Wait 5 seconds, refresh page, check console for errors

---

## For Demo/Testing Only

**Demo accounts (all have completed onboarding):**
- `demo@connection.room` / `Demo123!`
- `test@connection.room` / `Test123!`

**Demo partners available:**
- Alex Chen, Jordan Williams, Marcus Johnson, Sam Martinez (and 6 more)
- Accessible via "Suggested Connections" → Browse profiles

**Demo mode limitations:**
- Messages only visible in one browser
- No notifications between devices
- No persistence if cache cleared
- Timer doesn't sync with partner

---

## Next Steps for Phase 2

When ready to migrate to Supabase:

1. **Apply migration:**
   ```bash
   supabase db push supabase/migrations/010_add_connection_messages_and_requests.sql
   ```

2. **Verify RLS policies:**
   - Test in Supabase Studio that policies work
   - Try to query messages across connections (should fail)

3. **Enable Supabase queries:**
   - messages.ts already supports it
   - Just needs table to exist

4. **Load test:**
   - Send 100+ messages
   - Monitor Supabase performance

5. **Deploy:**
   - Push to staging
   - Test with real Supabase
   - Deploy to production

---

## Questions or Issues?

1. **Check console:** DevTools → Console tab for error messages
2. **Check storage:** DevTools → Application → localStorage → search for "connection"
3. **Check git:** `git log --oneline` to see recent commits
4. **Check Bash:** Restart dev server if needed: `npm run dev`

For beta launch, demo mode is sufficient. Real persistence comes in Phase 2.
