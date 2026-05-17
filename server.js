require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const adminRoutes = require('./routes/admin');
const merchantApiRoutes = require('./routes/merchantApi');

app.use('/admin', adminRoutes);
app.use('/api/v1', merchantApiRoutes);

// Public announcement (no auth)
app.get('/api/announcement', async (req, res) => {
    const db = require('./database/db');
    const setting = await db.getSetting('announcement');
    if (setting && setting.value) {
        try {
            const d = JSON.parse(setting.value);
            res.json({
                text: d.text || '', fixed_text: d.fixed_text || '',
                color: d.color || 'default', speed: d.speed || 'normal',
                scrolling_enabled: d.scrolling_enabled !== false,
                fixed_enabled: d.fixed_enabled !== false
            });
        } catch {
            res.json({ text: setting.value, fixed_text: '', color: 'default', speed: 'normal', scrolling_enabled: true, fixed_enabled: true });
        }
    } else {
        res.json({ text: '', fixed_text: '', color: 'default', speed: 'normal', scrolling_enabled: true, fixed_enabled: true });
    }
});

// Public site info (balance + rate + branding)
app.get('/api/site-info', async (req, res) => {
    const db = require('./database/db');
    try {
        const allKeys = await db.getAllSourceCDKeys();
        const activeKeys = allKeys.filter(k => k.is_active);
        const totalCredits = activeKeys.reduce((sum, k) => sum + (k.cached_balance || 0), 0);
        const rateSetting = await db.getSetting('deposit_rate');
        const pointPrice = rateSetting ? parseFloat(rateSetting.value) : 1;
        // Branding
        const brandKeys = ['brand_name', 'brand_subtitle', 'hero_title', 'hero_subtitle', 'hero_description', 'logo_url'];
        const branding = {};
        for (const key of brandKeys) {
            const s = await db.getSetting(key);
            if (s && s.value) branding[key] = s.value;
        }
        res.json({
            credits: totalCredits,
            has_stock: totalCredits > 0,
            point_price: pointPrice,
            branding
        });
    } catch(e) {
        res.json({ credits: 0, has_stock: false, point_price: 1, branding: {} });
    }
});

// Public CDK creation (one per browser fingerprint)
app.post('/api/create-cdk', async (req, res) => {
    const db = require('./database/db');
    const { generateCDK } = require('./services/cdkGenerator');
    try {
        let { name } = req.body;
        if (!name || typeof name !== 'string') return res.status(400).json({ success: false, error: 'Name is required' });
        
        // Sanitize name: only letters, numbers, max 12 chars
        name = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 12);
        if (name.length < 2) return res.status(400).json({ success: false, error: 'Name must be at least 2 characters (letters/numbers only)' });
        
        // Get active source key
        const activeKey = await db.getActiveSourceCDKey();
        if (!activeKey) return res.status(400).json({ success: false, error: 'Service not available right now' });
        
        // Generate CDK with the user's name as prefix
        const code = generateCDK(name);
        
        // Create CDK with 0 points (user must deposit to get points)
        const result = await db.insertPlatformCDK(code, `Self-registered: ${name}`, 0, 0, activeKey.id);
        await db.insertLog(result.id, null, 'cdk_self_created', `Public CDK ${code} self-registered`);
        
        res.json({ success: true, code: result.code, message: 'CDK created successfully!' });
    } catch (err) {
        console.error('[Create CDK]', err.message);
        if (err.message?.includes('duplicate')) return res.status(400).json({ success: false, error: 'Try again with a different name' });
        res.status(500).json({ success: false, error: 'Failed to create CDK' });
    }
});

// Serve pages
const serveIndex = (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'));
app.get('/', serveIndex);
// SPA tab routes
['dashboard', 'submit', 'orders', 'deposit', 'api', 'settings'].forEach(tab => app.get('/' + tab, serveIndex));

app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs', 'index.html'));
});

// Binance Pay Webhook
app.post('/webhook/binance', async (req, res) => {
    const db = require('./database/db');
    try {
        const { bizType, data } = req.body;
        console.log('[BinancePay Webhook] Received:', bizType);

        if (bizType === 'PAY' && data) {
            const tradeNo = data.merchantTradeNo;
            const deposit = await db.getDepositByTradeNo(tradeNo);

            if (deposit && deposit.status === 'pending') {
                await db.updateDepositStatus('paid', deposit.id);
                await db.addPointsToCDK(deposit.points_credited, deposit.points_credited, deposit.cdk_id);
                await db.insertLog(deposit.cdk_id, null, 'deposit_paid',
                    `Deposit ${deposit.amount_usdt} USDT → ${deposit.points_credited} points credited`
                );
                console.log(`[BinancePay] Deposit #${deposit.id} PAID`);
            }
        }

        res.json({ returnCode: 'SUCCESS', returnMessage: null });
    } catch (err) {
        console.error('[BinancePay Webhook] Error:', err.message);
        res.json({ returnCode: 'SUCCESS', returnMessage: null });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Seed database on first load
const db = require('./database/db');
db.seed().catch(err => console.error('[Seed Error]', err.message));

// Start server (local development only — Vercel uses the export below)
if (process.env.VERCEL !== '1') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Diaa Store Pixel Verify running on http://localhost:${PORT}`);
        console.log(`📊 Admin Panel: http://localhost:${PORT}/admin-panel`);
        console.log(`📖 API Docs: http://localhost:${PORT}/docs`);
        console.log(`🏪 Merchant Dashboard: http://localhost:${PORT}\n`);

        // Start background order sync
        const { startOrderSync } = require('./services/orderSync');
        startOrderSync();

        // Start background deposit checker
        const { startDepositChecker } = require('./services/depositChecker');
        startDepositChecker();
    });
}

// Export for Vercel serverless
module.exports = app;
