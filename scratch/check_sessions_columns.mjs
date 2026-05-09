import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'sessions' });
    if (error) {
        console.error('Error fetching columns:', error);
        // Fallback: try to select one row and see keys
        const { data: row } = await supabase.from('sessions').select('*').limit(1);
        if (row && row.length > 0) {
            console.log('Columns found in a row:', Object.keys(row[0]));
        } else {
            console.log('No rows found to check columns.');
        }
    } else {
        console.log('Columns:', data);
    }
}

checkColumns();
