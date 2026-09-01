const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const db = require('../database/db');

// Keep-Alive HTTPS Agent to maintain persistent TCP socket with Telegram servers
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 25,
    timeout: 30000
});

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Robust execution helper with automatic retry for ECONNRESET / network drops
 */
async function executeWithRetry(requestFn, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (err) {
            lastError = err;
            const isNetworkReset = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND' || err.message.includes('ECONNRESET');
            if (isNetworkReset && attempt < maxRetries) {
                console.log(`[Telegram Network Resilience] Network reset (${err.code || err.message}). Retrying attempt ${attempt + 1}/${maxRetries} in 1.5s...`);
                await delay(1500);
                continue;
            }
            throw err;
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
            const isLocalFile = mediaUrl && mediaUrl.startsWith('/uploads/');

            response = await executeWithRetry(async () => {
                if (isLocalFile) {
                    const localFilePath = path.join(process.cwd(), 'public', mediaUrl);
                    if (fs.existsSync(localFilePath)) {
                        // Send actual local file stream directly to Telegram Bot API
                        const form = new FormData();
                        form.append('chat_id', telegramChatId);
                        form.append('photo', fs.createReadStream(localFilePath));
                        if (message) form.append('caption', message);
                        form.append('parse_mode', 'Markdown');

                        return await axios.post(`${baseUrl}/sendPhoto`, form, {
                            headers: form.getHeaders(),
                            httpsAgent,
                            timeout: 25000
                        });
                    } else {
                        // Fallback to text message if file missing
                        return await axios.post(`${baseUrl}/sendMessage`, {
                            chat_id: telegramChatId,
                            text: message,
                            parse_mode: 'Markdown'
                        }, { httpsAgent, timeout: 25000 });
                    }
                } else if (mediaUrl) {
                    // External image URL
                    return await axios.post(`${baseUrl}/sendPhoto`, {
                        chat_id: telegramChatId,
                        photo: mediaUrl,
                        caption: message,
                        parse_mode: 'Markdown'
                    }, { httpsAgent, timeout: 25000 });
                } else {
                    // Text only
                    return await axios.post(`${baseUrl}/sendMessage`, {
                        chat_id: telegramChatId,
                        text: message,
                        parse_mode: 'Markdown'
                    }, { httpsAgent, timeout: 25000 });
                }
            });

            const messageId = response.data?.result?.message_id;
            db.addLog('POST', 'TELEGRAM', `Telegram post published successfully! Message ID: ${messageId}`);
            return { success: true, postId: messageId };
        } catch (error) {
            const errDetail = error.response?.data?.description || error.message;
            console.error('[Telegram Publish Error]:', error.response?.data || error.message);
            db.addLog('POST', 'TELEGRAM', `Telegram Publish Error: ${errDetail}`, 'failed');
            return { success: false, error: errDetail };
        }
    },

    // Reply to Telegram User
    sendMessage: async (chatId, text) => {
        const { telegramBotToken } = db.getSettings();
        if (!telegramBotToken || !chatId || !text) return;

        try {
            await executeWithRetry(async () => {
                await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'Markdown'
                }, { httpsAgent, timeout: 25000 });
            });
            db.addLog('DM_REPLY', 'TELEGRAM', `Telegram message sent to chat ID: ${chatId}`);
        } catch (error) {
            console.error('[Telegram Send Error]:', error.response?.data || error.message);
            db.addLog('DM_REPLY', 'TELEGRAM', `Telegram reply failed: ${error.message}`, 'failed');
        }
    }
};

module.exports = telegramService;
