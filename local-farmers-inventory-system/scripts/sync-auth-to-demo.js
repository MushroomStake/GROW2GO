#!/usr/bin/env node
/*
  Sync Supabase Auth users into the users_demo table.
  Usage:
    SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-auth-to-demo.js
    node scripts/sync-auth-to-demo.js --dry-run
*/
const { createClient } = require('@supabase/supabase-js');

(async function main() {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const DRY = process.argv.includes('--dry-run');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
      process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    console.log('Listing auth users...');
    // We'll paginate to be safe
    let allUsers = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      if (!data || data.length === 0) break;
      allUsers = allUsers.concat(data);
      if (data.length < perPage) break;
      page += 1;
    }

    console.log(`Found ${allUsers.length} auth users`);

    let created = 0;
    let skipped = 0;
    for (const u of allUsers) {
      const email = u.email;
      if (!email) {
        console.warn('Skipping user with no email', u.id);
        continue;
      }

      // check users_demo
      const { data: rows, error: selErr } = await supabase.from('users_demo').select('id').eq('email', email).limit(1);
      if (selErr) {
        console.error('Error querying users_demo for', email, selErr.message || selErr);
        continue;
      }
      if (rows && rows.length > 0) {
        skipped += 1;
        continue;
      }

      const name = (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || '';
      const contact = (u.user_metadata && u.user_metadata.contact) || '';

      const insertObj = { name, email, contact, password_hash: '', is_admin: false };
      console.log(DRY ? '[dry-run] Would insert:' : 'Inserting:', insertObj);
      if (!DRY) {
        const { data: ins, error: insErr } = await supabase.from('users_demo').insert([insertObj]);
        if (insErr) {
          console.error('Insert error for', email, insErr.message || insErr);
          continue;
        }
        created += 1;
      }
    }

    console.log(`Sync complete. created=${created}, skipped=${skipped}`);
    process.exit(0);
  } catch (e) {
    console.error('Sync failed', e);
    process.exit(2);
  }
})();
