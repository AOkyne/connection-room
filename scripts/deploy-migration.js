#!/usr/bin/env node

/**
 * Migration Deployment Script
 * Deploys SQL migrations to Supabase using the REST API
 *
 * Usage: node scripts/deploy-migration.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, 'https:');

    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data || '{}'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function deployMigration(migrationFile) {
  console.log(`\n📦 Deploying migration: ${path.basename(migrationFile)}`);
  console.log('─'.repeat(50));

  const sql = fs.readFileSync(migrationFile, 'utf-8');

  // Split by semicolons but keep them together for complex statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s + ';');

  let executed = 0;
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        console.log(`⏳ Executing statement ${executed + 1}/${statements.length}...`);
        await executeSql(statement);
        executed++;
      } catch (err) {
        console.error(`❌ Error executing statement:`);
        console.error(statement.substring(0, 100) + '...');
        console.error(err.message);
        throw err;
      }
    }
  }

  console.log(`✅ Migration deployed successfully (${executed} statements)`);
}

async function main() {
  try {
    console.log('🚀 Connection Room - Migration Deployment');
    console.log(`📍 Supabase: ${SUPABASE_URL}`);

    // Find the latest migration
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error('❌ No migration files found');
      process.exit(1);
    }

    // Deploy the most recent migration (010_add_connection_messages_and_requests.sql)
    const targetMigration = files.find(f => f.includes('connection_messages'));

    if (!targetMigration) {
      console.error('❌ Could not find connection_messages migration');
      process.exit(1);
    }

    const migrationPath = path.join(migrationsDir, targetMigration);
    await deployMigration(migrationPath);

    console.log('\n✅ All done!');
    console.log('📝 Tables created:');
    console.log('   - connection_requests');
    console.log('   - connections');
    console.log('   - connection_messages');
    console.log('   - connection_preferences');
    console.log('\n🔒 RLS policies enabled');
    console.log('⚡ Indexes created');
    console.log('\n💬 Chat feature now using Supabase persistence!');

  } catch (err) {
    console.error('\n❌ Deployment failed:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
