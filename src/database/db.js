const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

// Read collection
function readCollection(collection, defaultData = []) {
    const filePath = getFilePath(collection);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.error(`Error reading ${collection}:`, err);
        return defaultData;
    }
}

// Write collection
function writeCollection(collection, data) {
    const filePath = getFilePath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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
        // Keep last 50 posts only for lightweight SaaS history
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
            type, // 'POST', 'DM_REPLY', 'COMMENT_REACTION', 'COMMENT_REPLY', 'WEBHOOK'
            platform, // 'FACEBOOK', 'INSTAGRAM', 'TELEGRAM', 'LINKEDIN', 'WHATSAPP'
            details,
            status
        };
        logs.unshift(logEntry);
        // Keep last 100 logs for lightweight log history
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
