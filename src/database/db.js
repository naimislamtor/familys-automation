const fs = require('fs');
const path = require('path');
const os = require('os');

const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isVercel ? path.join(os.tmpdir(), 'data') : path.join(__dirname, '../../data');

// Ensure data directory exists safely
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (e) {}

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

// In-memory fallback cache for Vercel Serverless
const memoryStore = {};

// Read collection safely
function readCollection(collection, defaultData = []) {
    const filePath = getFilePath(collection);
    try {
        if (!fs.existsSync(filePath)) {
            try {
                fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            } catch (wErr) {
                memoryStore[collection] = memoryStore[collection] || defaultData;
                return memoryStore[collection];
            }
            return defaultData;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        return memoryStore[collection] || defaultData;
    }
}

// Write collection safely
function writeCollection(collection, data) {
    memoryStore[collection] = data;
    try {
        const filePath = getFilePath(collection);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        // Fallback to in-memory store on read-only environments
    }
}

// Helper methods
const db = {
    // Conversation Memory (Last 10 messages per user/senderId)
    getConversationHistory: (senderId, limit = 10) => {
        if (!senderId) return [];
        const historyStore = readCollection('conversations', {});
        const senderHistory = historyStore[senderId] || [];
        return limit ? senderHistory.slice(-limit) : senderHistory;
    },
    addConversationMessage: (senderId, role, text) => {
        if (!senderId || !text) return;
        const historyStore = readCollection('conversations', {});
        const senderHistory = historyStore[senderId] || [];
        senderHistory.push({ role, text, timestamp: new Date().toISOString() });
        if (senderHistory.length > 10) senderHistory.shift(); // Keep last 10 messages
        historyStore[senderId] = senderHistory;
        writeCollection('conversations', historyStore);
    },

    // Posts
    getPosts: (limit = 20) => {
        const posts = readCollection('posts', []);
        return limit ? posts.slice(0, limit) : posts;
    },
    savePost: (post) => {
        const posts = readCollection('posts', []);
        post.id = post.id || `post_${Date.now()}`;
        post.createdAt = post.createdAt || new Date().toISOString();
        posts.unshift(post);
        if (posts.length > 50) posts.pop();
        writeCollection('posts', posts);
        return post;
    },
    deletePost: (id) => {
        let posts = readCollection('posts', []);
        posts = posts.filter(p => p.id !== id);
        writeCollection('posts', posts);
    },
    clearPosts: () => {
        writeCollection('posts', []);
    },

    // Rules
    getRules: () => readCollection('rules', [
        {
            id: 'rule_ai_fallback',
            keyword: '*',
            matchType: 'fallback',
            actions: {
                reaction: 'LOVE',
                publicReply: '',
                privateDM: '',
                aiEnabled: true
            },
            active: true
        }
    ]),
    saveRule: (rule) => {
        const rules = readCollection('rules', []);
        if (rule.id) {
            const index = rules.findIndex(r => r.id === rule.id);
            if (index !== -1) rules[index] = { ...rules[index], ...rule };
            else rules.unshift(rule);
        } else {
            rule.id = `rule_${Date.now()}`;
            rules.unshift(rule);
        }
        writeCollection('rules', rules);
        return rule;
    },
    deleteRule: (id) => {
        let rules = readCollection('rules', []);
        rules = rules.filter(r => r.id !== id);
        writeCollection('rules', rules);
    },

    // Logs
    getLogs: (limit = 100) => {
        const logs = readCollection('logs', []);
        return limit ? logs.slice(0, limit) : logs;
    },
    addLog: (type, platform, details, status = 'success') => {
        const logs = readCollection('logs', []);
        const logEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
            type,
            platform,
            details,
            status
        };
        logs.unshift(logEntry);
        if (logs.length > 100) logs.pop();
        writeCollection('logs', logs);
        return logEntry;
    },

    // Settings with Environment Variables Fallback for Vercel
    getSettings: () => {
        const saved = readCollection('settings', {});
        return {
            fbPageToken: (saved.fbPageToken && saved.fbPageToken.trim()) || process.env.FB_PAGE_TOKEN || '',
            fbPageId: (saved.fbPageId && saved.fbPageId.trim()) || process.env.FB_PAGE_ID || '',
            igAccountId: (saved.igAccountId && saved.igAccountId.trim()) || process.env.IG_ACCOUNT_ID || '',
            telegramBotToken: (saved.telegramBotToken && saved.telegramBotToken.trim()) || process.env.TELEGRAM_BOT_TOKEN || '',
            telegramChatId: (saved.telegramChatId && saved.telegramChatId.trim()) || process.env.TELEGRAM_CHAT_ID || '',
            linkedinAccessToken: (saved.linkedinAccessToken && saved.linkedinAccessToken.trim()) || process.env.LINKEDIN_TOKEN || '',
            linkedinAuthorId: (saved.linkedinAuthorId && saved.linkedinAuthorId.trim()) || process.env.LINKEDIN_AUTHOR_ID || '',
            whatsappToken: (saved.whatsappToken && saved.whatsappToken.trim()) || process.env.WHATSAPP_TOKEN || '',
            whatsappPhoneId: (saved.whatsappPhoneId && saved.whatsappPhoneId.trim()) || process.env.WHATSAPP_PHONE_ID || '',
            geminiApiKey: (saved.geminiApiKey && saved.geminiApiKey.trim()) || process.env.GEMINI_API_KEY || '',
            systemPrompt: (saved.systemPrompt && saved.systemPrompt.trim()) || process.env.SYSTEM_PROMPT || 'আপনি "Family\'s" ইসলামী পেজের একজন অত্যন্ত বিজ্ঞ, মার্জিত, সহানুভূতির অধিকারী এবং স্মার্ট ইসলামিক এআই অ্যাসিস্ট্যান্ট। পবিত্র কুরআনের যেকোনো আয়াতের বাংলা অনুবাদ, হাদিস বা ইসলামিক প্রশ্নের নির্ভুল উত্তর বাংলায় চমৎকার ২-৩ লাইনে দেবেন।',
            webhookVerifyToken: (saved.webhookVerifyToken && saved.webhookVerifyToken.trim()) || process.env.WEBHOOK_VERIFY_TOKEN || 'antigravity_secret_token_123',
            aiCronEnabled: saved.aiCronEnabled || false,
            aiCronTime: saved.aiCronTime || '10:00',
            aiCronPrompt: saved.aiCronPrompt || '',
            aiCronPlatforms: saved.aiCronPlatforms || ['FACEBOOK', 'INSTAGRAM', 'TELEGRAM'],
            aiCronLastRunDate: saved.aiCronLastRunDate || ''
        };
    },
    saveSettings: (newSettings) => {
        const current = readCollection('settings', {});
        const updated = { ...current, ...newSettings };
        writeCollection('settings', updated);
        return updated;
    }
};

module.exports = db;
