#!/usr/bin/env node

/**
 * Seed test users into Supabase for development/testing
 * 
 * This script creates test users using the Supabase Admin API.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.
 * 
 * Usage:
 *   node scripts/seed-test-users.js
 * 
 * Or from root:
 *   node scripts/seed-test-users.js
 */

const path = require('path');
const fs = require('fs');

// Try to load dependencies from server/node_modules or root
let createClient;
try {
  // Try root node_modules first
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  // Fallback to server node_modules
  const serverSupabasePath = path.join(__dirname, '..', 'server', 'node_modules', '@supabase', 'supabase-js');
  if (fs.existsSync(serverSupabasePath)) {
    createClient = require(serverSupabasePath).createClient;
  } else {
    console.error('❌ Error: @supabase/supabase-js not found.');
    console.error('   Install it with: npm install @supabase/supabase-js');
    process.exit(1);
  }
}

// Try to load dotenv
let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  // Try server node_modules
  const serverDotenvPath = path.join(__dirname, '..', 'server', 'node_modules', 'dotenv');
  if (fs.existsSync(serverDotenvPath)) {
    dotenv = require(serverDotenvPath);
  }
}

// Load .env if dotenv is available
// Try multiple common locations for .env file
if (dotenv) {
  const possibleEnvPaths = [
    path.join(__dirname, '..', '.env'),           // Root directory
    path.join(__dirname, '..', 'server', '.env'), // Server directory
    '.env'                                         // Current directory
  ];

  let envLoaded = false;
  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`✅ Loaded environment variables from: ${envPath}`);
      envLoaded = true;
      break;
    }
  }

  if (!envLoaded) {
    console.log('⚠️  No .env file found. Checking environment variables...');
  }
} else {
  console.log('⚠️  dotenv not available. Using environment variables from system.');
}

// Validate required environment variables before creating client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Error: Missing required environment variables!');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   Please create a .env file in the root directory with:');
  console.error('   SUPABASE_URL=your_supabase_url');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('\n   Or set them as environment variables before running the script.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testUsers = [
  {
    email: 'test1@example.com',
    password: 'TestPassword123!',
    full_name: 'Test User One',
    display_name: 'Test User One',
    username: 'testuser1',
    bio: 'Love cooking Italian food! 🍝'
  },
  {
    email: 'test2@example.com',
    password: 'TestPassword123!',
    full_name: 'Test User Two',
    display_name: 'Test User Two',
    username: 'testuser2',
    bio: 'Passionate baker 🍰'
  },
  {
    email: 'test3@example.com',
    password: 'TestPassword123!',
    full_name: 'Test User Three',
    display_name: 'Test User Three',
    username: 'testuser3',
    bio: 'Grill master 🔥'
  },
  {
    email: 'chef.alex@example.com',
    password: 'TestPassword123!',
    full_name: 'Alex Chef',
    display_name: 'Chef Alex',
    username: 'chefalex',
    bio: 'Professional chef sharing home recipes 👨‍🍳'
  },
  {
    email: 'baker.maria@example.com',
    password: 'TestPassword123!',
    full_name: 'Maria Baker',
    display_name: 'Maria the Baker',
    username: 'mariabaker',
    bio: 'Baking enthusiast | Sweet treats daily 🧁'
  },
  {
    email: 'sarah.vegan@example.com',
    password: 'TestPassword123!',
    full_name: 'Sarah Green',
    display_name: 'Sarah Green',
    username: 'sarahvegan',
    bio: 'Plant-based recipes and healthy living 🌱'
  },
  {
    email: 'mike.bbq@example.com',
    password: 'TestPassword123!',
    full_name: 'Mike Johnson',
    display_name: 'Mike BBQ',
    username: 'mikebbq',
    bio: 'BBQ enthusiast | Smoked meats and sauces 🍖'
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users...\n');

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of testUsers) {
    try {
      // Create auth user with Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email for testing
        user_metadata: {
          full_name: user.full_name,
          name: user.full_name,
          display_name: user.display_name,
          username: user.username.toLowerCase()
        }
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          console.log(`⏭️  ${user.email} already exists, skipping...`);
          skipped++;
          continue;
        }
        throw authError;
      }

      // Wait a moment for the handle_new_user trigger to fire
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile if handle_new_user trigger didn't populate everything
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: user.full_name,
          display_name: user.display_name,
          username: user.username.toLowerCase(),
          bio: user.bio,
          email: user.email
        })
        .eq('id', authData.user.id);

      if (profileError && !profileError.message.includes('No rows')) {
        console.error(`⚠️  Profile update error for ${user.email}:`, profileError.message);
      }

      console.log(`✅ Created: ${user.display_name} (@${user.username}) - ${user.email}`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create ${user.email}:`, error.message);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (created > 0 || skipped > 0) {
    console.log('\n📝 Login credentials (all use the same password):');
    console.log('   Password: TestPassword123!');
    console.log('\n   Users:');
    testUsers.forEach(user => {
      console.log(`   - ${user.email} (@${user.username})`);
    });
  }
}

createTestUsers().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

