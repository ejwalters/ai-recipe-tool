const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStorage() {
  try {
    console.log('Testing Supabase Storage setup...');
    
    // Test bucket access
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return;
    }
    
    console.log('Available buckets:', buckets.map(b => b.name));
    
    // Check if avatars bucket exists
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    if (avatarsBucket) {
      console.log('✅ Avatars bucket found!');
    } else {
      console.log('❌ Avatars bucket not found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStorage();