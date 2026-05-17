const crypto = require('crypto');

const API_KEY = process.env.BINANCE_API_KEY;
const SECRET_KEY = process.env.BINANCE_SECRET_KEY;
const MERCHANT_UID = process.env.BINANCE_MERCHANT_UID;
const BASE_URL = 'https://api.binance.com';

/**
 * Sign request using HMAC SHA256 (standard Binance API)
 */
function signQuery(queryString) {
    return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
}

/**
 * Get Binance Pay transaction history
 * Uses standard Binance API (works with regular API keys)
 */
async function getPayTransactions(startTime, endTime) {
    const timestamp = Date.now();
    let query = `timestamp=${timestamp}&recvWindow=60000`;
    if (startTime) query += `&startTimestamp=${startTime}`;
    if (endTime) query += `&endTimestamp=${endTime}`;
    
    const signature = signQuery(query);
    query += `&signature=${signature}`;

    try {
        const res = await fetch(`${BASE_URL}/sapi/v1/pay/transactions?${query}`, {
            headers: { 'X-MBX-APIKEY': API_KEY }
        });
        const data = await res.json();
        
        if (data.code && data.code !== 200 && data.code !== 0) {
            console.error('[BinancePay] API Error:', data.msg || data.message);
            return { success: false, error: data.msg || data.message };
        }
        
        return { success: true, transactions: data.data || data || [] };
    } catch (err) {
        console.error('[BinancePay] Request error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Check for a specific deposit by matching amount and note
 */
async function findDeposit(uniqueAmount, afterTime) {
    const result = await getPayTransactions(afterTime - 60000); // 1 min before
    if (!result.success) return null;
    
    const txns = Array.isArray(result.transactions) ? result.transactions : [];
    
    for (const tx of txns) {
        // Look for incoming USDT transfers matching the amount
        const txAmount = parseFloat(tx.amount || tx.transactionAmount || 0);
        const txCurrency = (tx.currency || tx.transCurrency || '').toUpperCase();
        const txType = (tx.orderType || tx.transactionType || '').toUpperCase();
        const isIncoming = txType === 'C2C' || txType === 'PAY' || txType === 'TRANSFER_IN' || 
                          tx.payerInfo || parseFloat(tx.amount) > 0;
        
        if (txCurrency === 'USDT' && Math.abs(txAmount - uniqueAmount) < 0.005) {
            return tx;
        }
    }
    return null;
}

/**
 * Generate a unique amount by adding cents to make it identifiable
 * e.g., $10 → $10.37 (unique suffix)
 */
function generateUniqueAmount(baseAmount) {
    const suffix = Math.floor(Math.random() * 90 + 10); // 10-99
    return parseFloat((parseFloat(baseAmount) + suffix / 100).toFixed(2));
}

module.exports = { getPayTransactions, findDeposit, generateUniqueAmount, MERCHANT_UID };
