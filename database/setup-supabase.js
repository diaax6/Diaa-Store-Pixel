/**
 * Create Supabase tables via the SQL API
 */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
// Extract project ref from URL
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

const SQL = `
-- Admins
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source CDKeys
CREATE TABLE IF NOT EXISTS source_cdkeys (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    cdkey TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    cached_balance NUMERIC DEFAULT 0,
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform CDKs (UPPER code for case-insensitive lookup)
CREATE TABLE IF NOT EXISTS platform_cdks (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT DEFAULT '',
    total_points NUMERIC NOT NULL DEFAULT 0,
    remaining_points NUMERIC NOT NULL DEFAULT 0,
    source_cdkey_id INTEGER REFERENCES source_cdkeys(id),
    webhook_url TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing
CREATE TABLE IF NOT EXISTS pricing (
    id SERIAL PRIMARY KEY,
    task_type TEXT NOT NULL UNIQUE,
    points_cost NUMERIC NOT NULL,
    source_credits NUMERIC NOT NULL,
    label_en TEXT DEFAULT '',
    label_ar TEXT DEFAULT ''
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    cdk_id INTEGER NOT NULL REFERENCES platform_cdks(id),
    email TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    twofa TEXT DEFAULT '',
    task_type TEXT NOT NULL,
    remote_task_id INTEGER,
    status TEXT DEFAULT 'pending',
    result_message TEXT DEFAULT '',
    offer_url TEXT DEFAULT '',
    has_offer_url BOOLEAN DEFAULT FALSE,
    charged_points NUMERIC NOT NULL DEFAULT 0,
    source_cdkey_id INTEGER REFERENCES source_cdkeys(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    cdk_id INTEGER,
    order_id INTEGER,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Deposits
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    cdk_id INTEGER NOT NULL REFERENCES platform_cdks(id),
    trade_no TEXT NOT NULL UNIQUE,
    amount_usdt NUMERIC NOT NULL,
    points_credited NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    binance_prepay_id TEXT DEFAULT '',
    checkout_url TEXT DEFAULT '',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function setup() {
    console.log('Creating Supabase tables via SQL...');
    console.log('Project:', PROJECT_REF);
    
    // Use the pg-meta SQL execution endpoint  
    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'x-connection-encrypted': 'true'
        },
        body: JSON.stringify({ query: SQL })
    });
    
    if (res.ok) {
        console.log('✅ Tables created!');
        return;
    }

    // Try alternative: Create an RPC function first then use it
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log('Response:', text.substring(0, 200));
    
    console.log('\n⚠️  Auto-creation failed. Please create tables manually:');
    console.log('1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('2. Paste the SQL below and click "Run":\n');
    console.log(SQL);
}

setup().catch(console.error);
