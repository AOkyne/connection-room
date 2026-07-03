# Post-Launch: Image Upload Migration

## Current State (Monday Launch)
- Profile photos are stored as **base64 data URLs** in the database
- Limits API request sizes to ~2MB per image
- Simpler setup, no Storage bucket needed

## Post-Launch Migration

### Step 1: Create Supabase Storage Bucket
```sql
-- In Supabase dashboard:
1. Go to Storage
2. Create bucket: "profile-photos"
3. Set to Private (RLS will control access)
```

### Step 2: Set RLS Policies for Storage
```sql
-- Allow users to upload their own photos
CREATE POLICY "Users can upload own profile photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view any profile photo
CREATE POLICY "Profile photos are public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-photos');
```

### Step 3: Update Onboarding to Use Storage Upload
Replace the base64 upload in `app/onboarding/page.tsx`:

```typescript
import { uploadProfilePhoto } from "@/lib/supabase/image-upload";

// In photo upload handler:
const photoUrl = await uploadProfilePhoto(userId, file);
if (photoUrl) {
  handleUpdate({ profilePhoto: photoUrl });
}
```

### Step 4: Backfill Existing Base64 Photos
For users who signed up before migration:
```typescript
// Create a migration script to convert base64 URLs to Storage uploads
// This extracts the base64 data, uploads to Storage, updates the profile_photo column
```

### Step 5: Update ProfilePhoto Column Type
The `profile_photo` column in profiles table will change from:
- **Before**: TEXT (contains full data URL: `data:image/png;base64,...`)
- **After**: TEXT (contains URL: `https://...supabase.co/storage/v1/object/...`)

No schema change needed—same column, different content.

## Benefits of Storage-Based Uploads
✅ Unlimited image sizes (up to Supabase limits)  
✅ Faster API requests (no large base64 strings)  
✅ Better performance (CDN-served images)  
✅ Easier image optimization  
✅ Proper access control via RLS  

## Implementation Time
~2-3 hours including testing and backfill

## When to Do This
After Monday launch, prioritize if:
- Users complain about image size limits
- API performance degrades with large photos
- You want to add image cropping/optimization
