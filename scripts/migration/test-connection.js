/**
 * Test Connection Script
 *
 * This script tests the connection to Supabase and Firebase
 * Run this after setting up your credentials in .env
 *
 * Usage: node test-connection.js
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('\n🧪 Testing Supabase Connection...\n');

// Check environment variables
console.log('📋 Checking environment variables...');
const requiredVars = [
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_ANON_KEY',
];

let missingVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName] || process.env[varName].includes('YOUR_')) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: NOT SET`);
  } else {
    console.log(`✅ ${varName}: ${process.env[varName].substring(0, 20)}...`);
  }
});

if (missingVars.length > 0) {
  console.log('\n❌ Missing environment variables!');
  console.log('📝 Please update your .env file with Supabase credentials from:');
  console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Test connection
async function testConnection() {
  try {
    console.log('\n🔌 Testing Supabase connection...');

    // Test 1: Simple query to verify connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "users" does not exist')) {
        console.log('⚠️  Connection successful, but schema not deployed yet!');
        console.log('📝 Next step: Deploy schema.sql to Supabase');
        console.log('   Go to: Supabase Dashboard → SQL Editor → Run schema.sql\n');
        return false;
      }
      throw error;
    }

    console.log('✅ Supabase connection successful!');

    // Test 2: Check if tables exist
    console.log('\n📊 Checking database schema...');

    const tables = [
      'users',
      'athletes',
      'coaches',
      'parents',
      'organizations',
      'posts',
      'post_likes',
      'post_comments',
      'events',
      'friendships',
      'groups',
    ];

    let tablesExist = 0;
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (!error) {
          console.log(`✅ Table exists: ${table}`);
          tablesExist++;
        }
      } catch (err) {
        console.log(`❌ Table missing: ${table}`);
      }
    }

    if (tablesExist === tables.length) {
      console.log(`\n✅ All ${tables.length} tables exist!`);
      console.log('🎉 Your database is ready for migration!');
    } else {
      console.log(`\n⚠️  Found ${tablesExist}/${tables.length} tables`);
      console.log('📝 Please deploy schema.sql to create missing tables');
    }

    return true;

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(error.message);
    return false;
  }
}

// Run test
testConnection()
  .then((success) => {
    if (success) {
      console.log('\n🚀 Ready to proceed with Phase 0!\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Please fix the issues above before continuing.\n');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('\n❌ Unexpected error:', err);
    process.exit(1);
  });
