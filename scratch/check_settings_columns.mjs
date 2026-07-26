import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data: row } = await supabase.from('center_settings').select('*').limit(1);
    if (row && row.length > 0) {
        console.log('Columns found in center_settings:', Object.keys(row[0]));
    } else {
        console.log('No rows found in center_settings to check columns.');
    }
}

checkColumns();
