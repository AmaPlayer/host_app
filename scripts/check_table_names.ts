
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTables() {
    console.log('Checking for table existence...');

    const tables = ['groups', 'group', 'group_members', 'group_memeber', 'group_posts', 'group_post'];

    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.log(`❌ Table '${t}': Error/Missing (${error.code})`);
        } else {
            console.log(`✅ Table '${t}': EXISTS`);
        }
    }
}

checkTables();
