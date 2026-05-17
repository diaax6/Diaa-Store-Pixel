require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function addNoteColumn() {
    // Try inserting a test row with 'note' to check if column exists
    const { error } = await supabase.rpc('', {});
    
    // Since we can't run raw SQL via client, let's test if column exists
    const { data, error: selectErr } = await supabase.from('deposits').select('note').limit(1);
    
    if (selectErr && selectErr.message.includes('note')) {
        console.log('Column "note" does not exist yet.');
        console.log('Please run this SQL in Supabase SQL Editor:');
        console.log("ALTER TABLE deposits ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';");
    } else {
        console.log('✅ Column "note" already exists or table is empty');
    }
}

addNoteColumn().catch(console.error);
