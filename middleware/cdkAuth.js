const db = require('../database/db');

/**
 * CDK-based authentication middleware for merchants
 * Validates CDK code from request body or query
 * Case-insensitive: accepts lowercase input, matches uppercase stored codes
 */
async function cdkAuth(req, res, next) {
    const cdkey = req.body?.cdkey || req.query?.cdkey;

    if (!cdkey) {
        return res.status(401).json({ success: false, error: 'CDK code is required' });
    }

    // Case-insensitive lookup (ilike in Supabase)
    const cdk = await db.getPlatformCDKByCode(cdkey, 'active');

    if (!cdk) {
        return res.status(401).json({ success: false, error: 'Invalid or inactive CDK code' });
    }

    req.cdk = cdk;
    next();
}

module.exports = cdkAuth;
