const crypto = require('crypto');

/**
 * Generate a unique CDK code for the platform
 * Format: DS-XXXXXXXX (8 alphanumeric chars)
 * @param {string} prefix - Code prefix (default: 'DS')
 * @returns {string} Generated CDK code
 */
function generateCDK(prefix = 'DS') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: 0,O,1,I
    let code = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return `${prefix}-${code}`;
}

/**
 * Generate multiple unique CDK codes
 * @param {number} count - Number of codes to generate
 * @param {string} prefix - Code prefix
 * @returns {string[]} Array of unique codes
 */
function generateMultipleCDKs(count, prefix = 'DS') {
    const codes = new Set();
    while (codes.size < count) {
        codes.add(generateCDK(prefix));
    }
    return Array.from(codes);
}

module.exports = { generateCDK, generateMultipleCDKs };
