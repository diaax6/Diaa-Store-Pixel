/**
 * Database layer — Supabase
 * All functions are async — callers must use await
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ==================== SEED ====================
async function seed() {
    // Default admin
    const { data: existingAdmin } = await supabase.from('admins').select('id').limit(1).single();
    if (!existingAdmin) {
        const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
        await supabase.from('admins').insert({ username: process.env.ADMIN_USERNAME || 'admin', password_hash: hash });
        console.log('[DB] Default admin created');
    }

    // Default pricing
    const { data: existingPricing } = await supabase.from('pricing').select('id').limit(1).single();
    if (!existingPricing) {
        await supabase.from('pricing').insert([
            { task_type: 'full', points_cost: 2, source_credits: 1.0, label_en: 'Full Activation (Visa + Subscribe)', label_ar: 'تفعيل كامل (فيزا + اشتراك)' },
            { task_type: 'extract', points_cost: 1, source_credits: 0.5, label_en: 'Extract Link Only', label_ar: 'استخراج رابط التفعيل فقط' },
            { task_type: 'purchase_link', points_cost: 1, source_credits: 0.5, label_en: 'Purchase Failed Link', label_ar: 'شراء رابط من طلب فاشل' }
        ]);
        console.log('[DB] Default pricing created');
    }

    // Default deposit rate
    const { data: existingRate } = await supabase.from('settings').select('value').eq('key', 'deposit_rate').single();
    if (!existingRate) {
        await supabase.from('settings').insert({ key: 'deposit_rate', value: process.env.DEPOSIT_RATE || '1' });
        console.log('[DB] Default deposit rate set');
    }
}

// ==================== ADMINS ====================
async function getAdmin(username) {
    const { data } = await supabase.from('admins').select('*').eq('username', username).single();
    return data;
}
async function getAdminById(id) {
    const { data } = await supabase.from('admins').select('*').eq('id', id).single();
    return data;
}
async function updateAdminPassword(hash, id) {
    await supabase.from('admins').update({ password_hash: hash }).eq('id', id);
}

// ==================== SOURCE CDKEYS ====================
async function getAllSourceCDKeys() {
    const { data } = await supabase.from('source_cdkeys').select('*').order('created_at', { ascending: false });
    return data || [];
}
async function getSourceCDKey(id) {
    const { data } = await supabase.from('source_cdkeys').select('*').eq('id', id).single();
    return data;
}
async function getActiveSourceCDKey() {
    const { data } = await supabase.from('source_cdkeys').select('*').eq('is_active', true).order('id').limit(1).single();
    return data;
}
async function getNextAvailableSource(excludeId) {
    let query = supabase.from('source_cdkeys').select('*').eq('is_active', true).gt('cached_balance', 0).order('id');
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.limit(1).single();
    return data;
}
async function insertSourceCDKey(name, cdkey) {
    const { data, error } = await supabase.from('source_cdkeys').insert({ name, cdkey }).select().single();
    if (error) throw error;
    return data;
}
async function updateSourceCDKeyBalance(balance, id) {
    await supabase.from('source_cdkeys').update({ cached_balance: balance, last_checked: new Date().toISOString() }).eq('id', id);
}
async function toggleSourceCDKey(isActive, id) {
    await supabase.from('source_cdkeys').update({ is_active: isActive }).eq('id', id);
}
async function deleteSourceCDKey(id) {
    await supabase.from('source_cdkeys').delete().eq('id', id);
}

// ==================== PLATFORM CDKS ====================
async function getAllPlatformCDKs() {
    const { data } = await supabase.from('platform_cdks').select('*, source_cdkeys(name)').order('created_at', { ascending: false });
    return (data || []).map(d => ({ ...d, source_name: d.source_cdkeys?.name || '' }));
}
async function getPlatformCDK(id) {
    const { data } = await supabase.from('platform_cdks').select('*').eq('id', id).single();
    return data;
}
// Case-insensitive CDK lookup
async function getPlatformCDKByCode(code, status) {
    const { data } = await supabase.from('platform_cdks').select('*').ilike('code', code).eq('status', status).single();
    return data;
}
async function insertPlatformCDK(code, label, totalPoints, remainingPoints, sourceId) {
    const { data, error } = await supabase.from('platform_cdks').insert({
        code: code.toUpperCase(), label, total_points: totalPoints, remaining_points: remainingPoints, source_cdkey_id: sourceId
    }).select().single();
    if (error) throw error;
    return data;
}
async function updatePlatformCDK(label, sourceId, id) {
    await supabase.from('platform_cdks').update({ label, source_cdkey_id: sourceId }).eq('id', id);
}
async function updatePlatformCDKPoints(remaining, id) {
    await supabase.from('platform_cdks').update({ remaining_points: remaining }).eq('id', id);
}
async function updatePlatformCDKStatus(status, id) {
    await supabase.from('platform_cdks').update({ status }).eq('id', id);
}
async function updatePlatformCDKWebhook(url, id) {
    await supabase.from('platform_cdks').update({ webhook_url: url }).eq('id', id);
}
async function addPointsToCDK(addTotal, addRemaining, id) {
    const cdk = await getPlatformCDK(id);
    if (!cdk) return;
    await supabase.from('platform_cdks').update({
        total_points: cdk.total_points + addTotal,
        remaining_points: cdk.remaining_points + addRemaining
    }).eq('id', id);
}
async function deletePlatformCDK(id) {
    // Delete all foreign key references first (cdk_id is NOT NULL, can't nullify)
    await supabase.from('activity_log').delete().eq('cdk_id', id);
    await supabase.from('deposits').delete().eq('cdk_id', id);
    await supabase.from('orders').delete().eq('cdk_id', id);
    const { error } = await supabase.from('platform_cdks').delete().eq('id', id);
    if (error) throw error;
}

// ==================== PRICING ====================
async function getAllPricing() {
    const { data } = await supabase.from('pricing').select('*');
    return data || [];
}
async function getPricingByType(taskType) {
    const { data } = await supabase.from('pricing').select('*').eq('task_type', taskType).single();
    return data;
}
async function updatePricing(pointsCost, taskType) {
    await supabase.from('pricing').update({ points_cost: pointsCost }).eq('task_type', taskType);
}

// ==================== ORDERS ====================
async function getAllOrders() {
    const { data } = await supabase.from('orders').select('*, platform_cdks(code, label)').order('created_at', { ascending: false });
    return (data || []).map(o => ({ ...o, cdk_code: o.platform_cdks?.code || '', cdk_label: o.platform_cdks?.label || '' }));
}
async function getOrdersByCDK(cdkId) {
    const { data } = await supabase.from('orders').select('*').eq('cdk_id', cdkId).order('created_at', { ascending: false });
    return data || [];
}
async function getOrder(id) {
    const { data } = await supabase.from('orders').select('*').eq('id', id).single();
    return data;
}
async function getOrderForCDK(id, cdkId) {
    const { data } = await supabase.from('orders').select('*').eq('id', id).eq('cdk_id', cdkId).single();
    return data;
}
async function getPendingAndRunningOrders() {
    const { data } = await supabase.from('orders')
        .select('*, platform_cdks(code, webhook_url, source_cdkey_id), source_cdkeys(cdkey)')
        .in('status', ['pending', 'running'])
        .order('created_at');
    return (data || []).map(o => ({
        ...o,
        cdk_code: o.platform_cdks?.code || '',
        webhook_url: o.platform_cdks?.webhook_url || '',
        source_cdkey_id: o.platform_cdks?.source_cdkey_id || o.source_cdkey_id,
        source_cdkey: o.source_cdkeys?.cdkey || ''
    }));
}
async function insertOrder(cdkId, email, passEnc, twofa, taskType, remoteId, status, chargedPts, sourceId) {
    const { data, error } = await supabase.from('orders').insert({
        cdk_id: cdkId, email, password_encrypted: passEnc, twofa, task_type: taskType,
        remote_task_id: remoteId, status, charged_points: chargedPts, source_cdkey_id: sourceId
    }).select().single();
    if (error) throw error;
    return data;
}
async function updateOrderStatus(status, message, offerUrl, hasOffer, id) {
    await supabase.from('orders').update({
        status, result_message: message, offer_url: offerUrl, has_offer_url: hasOffer, updated_at: new Date().toISOString()
    }).eq('id', id);
}
async function updateOrderRemoteId(remoteId, status, id) {
    await supabase.from('orders').update({ remote_task_id: remoteId, status }).eq('id', id);
}
async function cancelOrder(id) {
    await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
}

// ==================== ACTIVITY LOG ====================
async function insertLog(cdkId, orderId, action, details) {
    await supabase.from('activity_log').insert({ cdk_id: cdkId, order_id: orderId, action, details });
}
async function getRecentLogs(limit) {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit);
    return data || [];
}

// ==================== SETTINGS ====================
async function getSetting(key) {
    const { data } = await supabase.from('settings').select('value').eq('key', key).single();
    return data;
}
async function setSetting(key, value) {
    await supabase.from('settings').upsert({ key, value });
}

// ==================== STATS ====================
async function getOrderStats() {
    const { data } = await supabase.from('orders').select('status');
    const rows = data || [];
    return {
        total: rows.length,
        pending: rows.filter(r => r.status === 'pending' || r.status === 'running').length,
        success: rows.filter(r => r.status === 'success').length,
        failed: rows.filter(r => r.status === 'failed').length,
        cancelled: rows.filter(r => r.status === 'cancelled').length
    };
}
async function getOrderStatsByCDK(cdkId) {
    const { data } = await supabase.from('orders').select('status').eq('cdk_id', cdkId);
    const rows = data || [];
    return {
        total: rows.length,
        pending: rows.filter(r => r.status === 'pending' || r.status === 'running').length,
        success: rows.filter(r => r.status === 'success').length,
        failed: rows.filter(r => r.status === 'failed').length
    };
}
async function getTotalRevenue() {
    const { data } = await supabase.from('orders').select('charged_points').eq('status', 'success');
    const total = (data || []).reduce((s, r) => s + parseFloat(r.charged_points || 0), 0);
    return { total_revenue: total };
}
async function getTodayOrders() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('orders').select('id').gte('created_at', today);
    return { count: (data || []).length };
}
async function getActiveCDKCount() {
    const { data } = await supabase.from('platform_cdks').select('id').eq('status', 'active');
    return { count: (data || []).length };
}
async function getTotalSourceBalance() {
    const { data } = await supabase.from('source_cdkeys').select('cached_balance').eq('is_active', true);
    const total = (data || []).reduce((s, r) => s + parseFloat(r.cached_balance || 0), 0);
    return { total };
}
async function getTotalMerchantPointsIssued() {
    const { data } = await supabase.from('platform_cdks').select('total_points');
    const total = (data || []).reduce((s, r) => s + parseFloat(r.total_points || 0), 0);
    return { total };
}
async function getTotalMerchantPointsRemaining() {
    const { data } = await supabase.from('platform_cdks').select('remaining_points').eq('status', 'active');
    const total = (data || []).reduce((s, r) => s + parseFloat(r.remaining_points || 0), 0);
    return { total };
}
async function getTotalMerchantPointsUsed() {
    const { data } = await supabase.from('orders').select('charged_points').neq('status', 'cancelled');
    const total = (data || []).reduce((s, r) => s + parseFloat(r.charged_points || 0), 0);
    return { total };
}

// ==================== DEPOSITS ====================
async function insertDeposit(cdkId, tradeNo, amountUsdt, pointsCredited, status, prepayId, checkoutUrl, note) {
    const { data, error } = await supabase.from('deposits').insert({
        cdk_id: cdkId, trade_no: tradeNo, amount_usdt: amountUsdt, points_credited: pointsCredited,
        status, binance_prepay_id: prepayId, checkout_url: checkoutUrl, note: note || ''
    }).select().single();
    if (error) throw error;
    return data;
}
async function getDepositByTradeNo(tradeNo) {
    const { data } = await supabase.from('deposits').select('*').eq('trade_no', tradeNo).single();
    return data;
}
async function updateDepositStatus(status, id) {
    await supabase.from('deposits').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', id);
}
async function getDepositsByCDK(cdkId) {
    const { data } = await supabase.from('deposits').select('*').eq('cdk_id', cdkId).order('created_at', { ascending: false });
    return data || [];
}
async function getAllDeposits() {
    const { data } = await supabase.from('deposits').select('*, platform_cdks(code)').order('created_at', { ascending: false });
    return (data || []).map(d => ({ ...d, cdk_code: d.platform_cdks?.code || '' }));
}
async function getTotalDeposits() {
    const { data } = await supabase.from('deposits').select('amount_usdt').eq('status', 'paid');
    const total = (data || []).reduce((s, r) => s + parseFloat(r.amount_usdt || 0), 0);
    return { total };
}
async function getPendingDeposits() {
    const { data } = await supabase.from('deposits').select('*').eq('status', 'pending');
    return data || [];
}
async function expireOldDeposits() {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data } = await supabase.from('deposits').update({ status: 'expired' })
        .eq('status', 'pending').lt('created_at', fifteenMinAgo).select();
    return (data || []).length;
}
async function getDepositById(id) {
    const { data } = await supabase.from('deposits').select('*').eq('id', id).single();
    return data;
}
async function deleteDeposit(id) {
    // Delete related activity logs first
    await supabase.from('activity_log').delete().eq('order_id', null).ilike('details', `%deposit%${id}%`);
    await supabase.from('deposits').delete().eq('id', id);
}
async function deleteLog(id) {
    await supabase.from('activity_log').delete().eq('id', id);
}
async function clearAllLogs() {
    await supabase.from('activity_log').delete().neq('id', 0);
}

module.exports = {
    supabase, seed,
    // Admins
    getAdmin, getAdminById, updateAdminPassword,
    // Source CDKeys
    getAllSourceCDKeys, getSourceCDKey, getActiveSourceCDKey, getNextAvailableSource,
    insertSourceCDKey, updateSourceCDKeyBalance, toggleSourceCDKey, deleteSourceCDKey,
    // Platform CDKs
    getAllPlatformCDKs, getPlatformCDK, getPlatformCDKByCode,
    insertPlatformCDK, updatePlatformCDK, updatePlatformCDKPoints, updatePlatformCDKStatus,
    updatePlatformCDKWebhook, addPointsToCDK, deletePlatformCDK,
    // Pricing
    getAllPricing, getPricingByType, updatePricing,
    // Orders
    getAllOrders, getOrdersByCDK, getOrder, getOrderForCDK,
    getPendingAndRunningOrders, insertOrder, updateOrderStatus, updateOrderRemoteId, cancelOrder,
    // Activity Log
    insertLog, getRecentLogs, deleteLog, clearAllLogs,
    // Settings
    getSetting, setSetting,
    // Stats
    getOrderStats, getOrderStatsByCDK, getTotalRevenue, getTodayOrders, getActiveCDKCount,
    getTotalSourceBalance, getTotalMerchantPointsIssued, getTotalMerchantPointsRemaining, getTotalMerchantPointsUsed,
    // Deposits
    insertDeposit, getDepositByTradeNo, updateDepositStatus, getDepositsByCDK,
    getAllDeposits, getTotalDeposits, getPendingDeposits, expireOldDeposits, getDepositById, deleteDeposit
};
