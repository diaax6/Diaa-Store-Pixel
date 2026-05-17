// Uses native fetch (Node 18+)

/**
 * Send webhook notification to merchant
 * @param {string} url - Webhook URL
 * @param {object} payload - Event data
 */
async function sendWebhook(url, payload) {
    if (!url) return;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                timestamp: new Date().toISOString()
            }),
            timeout: 10000
        });
        console.log(`[Webhook] Sent to ${url} — Status: ${res.status}`);
    } catch (err) {
        console.error(`[Webhook] Failed to send to ${url}:`, err.message);
    }
}

/**
 * Notify merchant about order status change
 * @param {string} webhookUrl - Merchant webhook URL
 * @param {object} order - Order data
 */
async function notifyOrderUpdate(webhookUrl, order) {
    await sendWebhook(webhookUrl, {
        event: 'order.updated',
        order: {
            id: order.id,
            email: order.email,
            status: order.status,
            task_type: order.task_type,
            message: order.result_message || '',
            offer_url: order.offer_url || '',
            has_offer_url: !!order.has_offer_url
        }
    });
}

module.exports = { sendWebhook, notifyOrderUpdate };
