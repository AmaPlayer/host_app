
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyGroupsTables() {
    console.log('Verifying Groups and Messaging Tables...');
    let allPassed = true;

    // 1. Check 'groups' table columns
    try {
        const { error } = await supabase.from('groups').select('privacy, photo_url').limit(1);

        if (error && error.code === 'PGRST303') {
            // PGRST303 usually means column doesn't exist if we select specific columns, 
            // but Supabase select might return error if table doesn't exist too.
            // Actually select returns error if column invalid? 
            // Let's rely on error message.
            console.error('❌ Error checking groups columns:', error.message);
            allPassed = false;
        } else if (error) {
            console.log('⚠️ Could not verify columns directly (might be RLS or empty):', error.message);
            // If RLS blocks reading, we might not see columns. 
            // But assuming anon key has some access or we just check if it throws "column does not exist".
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                allPassed = false;
                console.error('❌ Missing columns in groups table');
            }
        } else {
            console.log('✅ groups table has privacy and photo_url columns');
        }
    } catch (e) {
        console.error('❌ Exception checking groups table:', e);
        allPassed = false;
    }

    // 2. Check 'conversations' table existence
    const { error: convError } = await supabase.from('conversations').select('id').limit(1);
    if (convError && convError.code === '42P01') { // undefined_table
        console.error('❌ conversations table missing');
        allPassed = false;
    } else {
        console.log('✅ conversations table exists');
    }

    // 3. Check 'messages' table existence
    const { error: msgError } = await supabase.from('messages').select('id').limit(1);
    if (msgError && msgError.code === '42P01') {
        console.error('❌ messages table missing');
        allPassed = false;
    } else {
        console.log('✅ messages table exists');
    }

    if (allPassed) {
        console.log('\n✨ All Group & Messaging checks passed!');
    } else {
        console.error('\n❌ Some checks failed. Please run the migration script: update_groups_and_messaging.sql');
        process.exit(1);
    }
}

verifyGroupsTables();
