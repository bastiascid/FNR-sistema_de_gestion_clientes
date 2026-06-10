const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Mock WebSocket for Node.js
global.WebSocket = class {};

// Load environment variables from .env.local
function loadEnv() {
  const envLocalPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envLocalPath)) {
    console.error('Error: .env.local not found.');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

async function run() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Supabase NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
    process.exit(1);
  }

  console.log(`Connecting to Supabase admin client at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const targetEmail = 'admin@fnr.cl';
  const targetPassword = 'admin123';

  console.log('Fetching users to check if admin already exists...');
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const existingUser = data.users.find(u => u.email === targetEmail);

  if (existingUser) {
    console.log(`Found existing user with email ${targetEmail}. Resetting password...`);
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: targetPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError.message);
      process.exit(1);
    }
    console.log(`Successfully updated password for ${targetEmail} to '${targetPassword}'.`);
  } else {
    console.log(`User ${targetEmail} not found. Creating a new user...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: targetPassword,
      email_confirm: true
    });

    if (createError) {
      console.error('Error creating user:', createError.message);
      process.exit(1);
    }
    console.log(`Successfully created user ${targetEmail} with password '${targetPassword}'.`);
  }
  
  console.log('Admin user configuration complete.');
}

run();
