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
            id: 'rule_default_price',
            keyword: 'price',
            matchType: 'contains',
            actions: {
                reaction: 'LIKE',
                publicReply: 'Hello! Check your inbox for price & order details. Thanks!',
                privateDM: 'Hi! Our starting price is $25. Would you like to place an order?',
                aiEnabled: false
            },
            active: true
        },
        {
            id: 'rule_ai_fallback',
            keyword: '*',
            matchType: 'fallback',
            actions: {
                reaction: 'LOVE',
                publicReply: 'Thank you for reaching out! We sent you a DM.',
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
            fbPageToken: saved.fbPageToken || process.env.FB_PAGE_TOKEN || '',
            fbPageId: saved.fbPageId || process.env.FB_PAGE_ID || '',
            igAccountId: saved.igAccountId || process.env.IG_ACCOUNT_ID || '',
            telegramBotToken: saved.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
            telegramChatId: saved.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
            linkedinAccessToken: saved.linkedinAccessToken || process.env.LINKEDIN_TOKEN || '',
            linkedinAuthorId: saved.linkedinAuthorId || process.env.LINKEDIN_AUTHOR_ID || '',
            whatsappToken: saved.whatsappToken || process.env.WHATSAPP_TOKEN || '',
            whatsappPhoneId: saved.whatsappPhoneId || process.env.WHATSAPP_PHONE_ID || '',
            geminiApiKey: saved.geminiApiKey || process.env.GEMINI_API_KEY || '',
            systemPrompt: saved.systemPrompt || process.env.SYSTEM_PROMPT || 'You are an intelligent social media customer support AI assistant for our business. Answer customer questions politely, concisely (under 3 sentences), and guide them to order or contact us for details.',
            webhookVerifyToken: saved.webhookVerifyToken || process.env.WEBHOOK_VERIFY_TOKEN || 'antigravity_secret_token_123',
            aiCronEnabled: saved.aiCronEnabled || false,
            aiCronTime: saved.aiCronTime || '10:00',
            aiCronPrompt: saved.aiCronPrompt || 'Generate a beautiful daily Quranic Verse with Arabic text, Bangla translation, and a short inspiring daily reflection.',
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
