
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' }); // Adjust path to root .env (running from root)
// apps/api/scripts -> apps/api -> apps -> root
// So it should be ../../../.env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Env Vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    const { data, error } = await supabase
        .from('orders')
        .select('*') // Check order status
        .eq('id', '4f056e85-7405-4a5c-a464-03ce21a875ca') // ID from screenshot
        .single();

    if (error) {
        console.error('Check Error:', error.message);
    } else {
        console.log('User found:', data);
    }
}

checkTable();
