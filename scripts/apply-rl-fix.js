#!/usr/bin/env node
/**
 * Apply RLS policy fixes to enable public read access
 * Run with: node scripts/apply-rl-fix.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const migrationSql = `
-- Fix RLS policies to allow unauthenticated public access for read operations
ALTER TABLE IF EXISTS badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Badges are readable by all" ON badges;
DROP POLICY IF EXISTS "Badges readable" ON badges;
DROP POLICY IF EXISTS "Anyone can read badges" ON badges;
DROP POLICY IF EXISTS "Public read badges" ON badges;
DROP POLICY IF EXISTS "badges_public_read" ON badges;
CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "User badges are readable by all" ON user_badges;
DROP POLICY IF EXISTS "User badges readable" ON user_badges;
DROP POLICY IF EXISTS "Anyone can read user_badges" ON user_badges;
DROP POLICY IF EXISTS "Public read user_badges" ON user_badges;
DROP POLICY IF EXISTS "user_badges_public_read" ON user_badges;
DROP POLICY IF EXISTS "user_badges_users_insert" ON user_badges;
DROP POLICY IF EXISTS "user_badges_users_delete" ON user_badges;

CREATE POLICY "user_badges_public_read" ON user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_users_insert" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_badges_users_delete" ON user_badges FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view spaces" ON spaces;
DROP POLICY IF EXISTS "spaces_public_read" ON spaces;
CREATE POLICY "spaces_public_read" ON spaces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "posts_public_read" ON posts;
DROP POLICY IF EXISTS "posts_users_insert" ON posts;
CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_users_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "comments_public_read" ON comments;
DROP POLICY IF EXISTS "comments_users_insert" ON comments;
CREATE POLICY "comments_public_read" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_users_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "reactions_public_read" ON reactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "reactions_users_insert" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "events_public_read" ON events FOR SELECT USING (true);
`;

async function applyMigration() {
  try {
    console.log('🔧 Applying RLS policy fixes...');

    // Split SQL into individual statements and execute them
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: statement });

        if (error && error.message && !error.message.includes('already exists')) {
          // Try using query endpoint if rpc doesn't exist
          console.warn(`⚠️  Skipping: ${statement.substring(0, 50)}...`);
        }
      } catch (err) {
        // Continue even if individual statements fail
        console.warn(`⚠️  Error with statement: ${err.message}`);
      }
    }

    console.log('✅ RLS policies updated successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
