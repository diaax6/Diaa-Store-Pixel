/**
 * Deposit Checker — polls Binance Pay transactions to match pending deposits
 * Runs every 30 seconds + auto-expires deposits older than 15 minutes
 */
const db = require('../database/db');
const BinancePay = require('./binancePay');

let isChecking = false;

async function checkPendingDeposits() {
    if (isChecking) return;
    isChecking = true;

    try {
        // Auto-expire deposits older than 15 minutes
        const expiredCount = await db.expireOldDeposits();
        if (expiredCount > 0) {
            console.log(`[DepositCheck] Auto-expired ${expiredCount} deposit(s) (>15 min)`);
        }

        // Get all pending deposits
        const pending = await db.getPendingDeposits();

        if (pending.length === 0) {
            isChecking = false;
            return;
        }

        console.log(`[DepositCheck] Checking ${pending.length} pending deposits...`);

        // Get recent Binance Pay transactions (last 1 hour)
        const since = Date.now() - 60 * 60 * 1000;
        const result = await BinancePay.getPayTransactions(since);

        if (!result.success || !Array.isArray(result.transactions)) {
            console.log('[DepositCheck] Could not fetch transactions:', result.error || 'No data');
            isChecking = false;
            return;
        }

        const txns = result.transactions;
        console.log(`[DepositCheck] Found ${txns.length} recent transactions`);

        for (const deposit of pending) {
            const match = txns.find(tx => {
                const txAmount = parseFloat(tx.amount || tx.transactionAmount || 0);
                const txCurrency = (tx.currency || tx.transCurrency || '').toUpperCase();
                const txNote = (tx.note || tx.remark || tx.memo || '').trim().toUpperCase();
                const depositNote = (deposit.note || '').trim().toUpperCase();
                
                // Match by note first (most reliable), fallback to amount match
                if (depositNote && txNote && txNote.includes(depositNote) && txCurrency === 'USDT') {
                    return true;
                }
                // Fallback: match by exact amount if no note
                return txCurrency === 'USDT' && Math.abs(txAmount - deposit.amount_usdt) < 0.005;
            });

            if (match) {
                console.log(`[DepositCheck] ✅ Matched deposit #${deposit.id} — $${deposit.amount_usdt} USDT [note: ${deposit.note}]`);
                await db.updateDepositStatus('paid', deposit.id);
                await db.addPointsToCDK(deposit.points_credited, deposit.points_credited, deposit.cdk_id);
                await db.insertLog(deposit.cdk_id, null, 'deposit_paid',
                    `Deposit $${deposit.amount_usdt} USDT confirmed — ${deposit.points_credited} points credited`
                );
            }
        }
    } catch (err) {
        console.error('[DepositCheck] Error:', err.message);
    }

    isChecking = false;
}

function startDepositChecker() {
    console.log('[DepositCheck] Background checker started (every 30s, auto-expire 15min)');
    setInterval(checkPendingDeposits, 30 * 1000);
    setTimeout(checkPendingDeposits, 10 * 1000);
}

module.exports = { startDepositChecker, checkPendingDeposits };
