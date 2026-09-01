const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const db = require('../database/db');

// Resilient HTTPS Agent with Keep-Alive
const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 15,
    timeout: 30000
});

// Helper for Exponential Retry on Socket Reset / ECONNRESET
async function executeWithRetry(fn, retries = 3, delayMs = 1500) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const isSocketReset = err.code === 'ECONNRESET' ||
                                  err.code === 'ETIMEDOUT' ||
                                  err.code === 'EPIPE' ||
                                  (err.response && err.response.status >= 500);

            if (isSocketReset && attempt < retries) {
                console.log(`[Telegram Network Resilience] Network reset (${err.code || err.response?.status}). Retrying attempt ${attempt + 1}/${retries} in ${delayMs / 1000}s...`);
                await new Promise(res => setTimeout(res, delayMs * attempt));
            } else {
                break;
            }
        }
    }
    throw lastError;
}

/**
 * Telegram Bot API Integration
 */
const telegramService = {
    // Post to Telegram Channel or Group
    publishPost: async ({ message, mediaUrl }) => {
        const { telegramBotToken, telegramChatId } = db.getSettings();
        if (!telegramBotToken || !telegramChatId) {
            db.addLog('POST', 'TELEGRAM', 'Telegram Bot Token or Chat ID missing in settings.', 'skipped');
            return { success: false, reason: 'Telegram Credentials Missing' };
        }

        const baseUrl = `https://api.telegram.org/bot${telegramBotToken}`;

        try {
            let response;
            const isBase64 = mediaUrl && mediaUrl.startsWith('data:image/');
            const isLocalFile = mediaUrl && mediaUrl.startsWith('/uploads/');

            response = await executeWithRetry(async () => {
                if (isBase64) {
                    const parts = mediaUrl.split(',');
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                    const buffer = Buffer.from(parts[1], 'base64');

                    const form = new FormData();
                    form.append('chat_id', telegramChatId);
                    form.append('photo', buffer, { filename: 'ai-banner.png', contentType: mimeType });
                    if (message) form.append('caption', message);

                    return await axios.post(`${baseUrl}/sendPhoto`, form, {
                        headers: form.getHeaders(),
                        httpsAgent,
                        timeout: 30000
                    });
                } else if (isLocalFile) {
                    const localFilePath = path.join(process.cwd(), 'public', mediaUrl);
                    if (fs.existsSync(localFilePath)) {
                        const form = new FormData();
                        form.append('chat_id', telegramChatId);
                        form.append('photo', fs.createReadStream(localFilePath));
                        if (message) form.append('caption', message);

                        return await axios.post(`${baseUrl}/sendPhoto`, form, {
                            headers: form.getHeaders(),
                            httpsAgent,
                            timeout: 30000
                        });
                    } else {
                        return await axios.post(`${baseUrl}/sendMessage`, {
                            chat_id: telegramChatId,
                            text: message
                        }, { httpsAgent, timeout: 25000 });
                    }
                } else if (mediaUrl) {
                    // External image URL
                    return await axios.post(`${baseUrl}/sendPhoto`, {
                        chat_id: telegramChatId,
                        photo: mediaUrl,
                        caption: message
                    }, { httpsAgent, timeout: 25000 });
                } else {
                    // Text message only
                    return await axios.post(`${baseUrl}/sendMessage`, {
                        chat_id: telegramChatId,
                        text: message
                    }, { httpsAgent, timeout: 25000 });
                }
            });

            const messageId = response.data?.result?.message_id;
            db.addLog('POST', 'TELEGRAM', `Telegram post published successfully! Message ID: ${messageId}`);
            return { success: true, postId: messageId };
        } catch (error) {
            const errDetail = error.response?.data?.description || error.message;
            console.error('[Telegram Publish Error]:', error.response?.data || error.message);
            db.addLog('POST', 'TELEGRAM', `Telegram Error: ${errDetail}`, 'failed');
            return { success: false, error: errDetail };
        }
    }
};

module.exports = telegramService;
