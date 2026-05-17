// Uses native fetch (Node 18+)

const AIDONE_API_URL = process.env.AIDONE_API_URL || 'https://aidone.lol/openapi';

/**
 * AiDone API Client
 * Wraps all calls to aidone.lol/openapi
 */
class AiDoneClient {
    /**
     * Check CDKey balance
     * @param {string} cdkey - Source CDKey
     * @returns {Promise<{success: boolean, remaining_uses?: number, error?: string}>}
     */
    static async getBalance(cdkey) {
        try {
            const res = await fetch(AIDONE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_balance', cdkey }),
                timeout: 15000
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('[AiDone] getBalance error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Submit a task to the queue
     * @param {string} cdkey - Source CDKey
     * @param {string} email - Account email
     * @param {string} password - Account password
     * @param {string} twofa - 2FA secret
     * @param {string} task_type - 'full' or 'extract'
     * @returns {Promise<{success: boolean, task_id?: number, remaining_uses?: number, error?: string}>}
     */
    static async submitTask(cdkey, email, password, twofa, task_type) {
        try {
            const res = await fetch(AIDONE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit_task',
                    cdkey,
                    email,
                    password,
                    twofa,
                    task_type
                }),
                timeout: 15000
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('[AiDone] submitTask error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get task status
     * @param {string} cdkey - Source CDKey
     * @param {string} email - Account email
     * @param {number} task_id - Task ID from aidone
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    static async getStatus(cdkey, email, task_id) {
        try {
            const res = await fetch(AIDONE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_status',
                    cdkey,
                    email,
                    task_id
                }),
                timeout: 15000
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('[AiDone] getStatus error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Cancel a pending task
     * @param {string} cdkey - Source CDKey
     * @param {number} task_id - Task ID from aidone
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    static async cancelTask(cdkey, task_id) {
        try {
            const res = await fetch(AIDONE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'cancel_task',
                    cdkey,
                    task_id
                }),
                timeout: 15000
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('[AiDone] cancelTask error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Purchase a failed task's offer link
     * @param {string} cdkey - Source CDKey
     * @param {number} task_id - Task ID from aidone
     * @returns {Promise<{success: boolean, offer_url?: string, remaining_uses?: number, error?: string}>}
     */
    static async purchaseFailedLink(cdkey, task_id) {
        try {
            const res = await fetch(AIDONE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'purchase_failed_link',
                    cdkey,
                    task_id
                }),
                timeout: 15000
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('[AiDone] purchaseFailedLink error:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = AiDoneClient;
