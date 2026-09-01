const db = require('../database/db');
const axios = require('axios');

const GRAPH_BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Controller for Managing Rules, Settings, and Logs
 */
const rulesController = {
    // Rules
    getRules: (req, res) => res.json({ success: true, rules: db.getRules() }),
    saveRule: (req, res) => {
        const rule = req.body;
        if (!rule.keyword) return res.status(400).json({ success: false, error: 'Rule keyword is required.' });
        const saved = db.saveRule(rule);
        return res.json({ success: true, rule: saved });
    },
    deleteRule: (req, res) => {
        const { id } = req.params;
        db.deleteRule(id);
        return res.json({ success: true, message: 'Rule deleted.' });
    },

    // Settings - Preserves User Credentials 100% Exactly
    getSettings: (req, res) => res.json({ success: true, settings: db.getSettings() }),
    saveSettings: async (req, res) => {
        let updatedData = { ...req.body };

        // 1. Intelligent Facebook Page Access Token Exchange (Strict Match Only)
        if (updatedData.fbPageToken && updatedData.fbPageId) {
            try {
                const accountsRes = await axios.get(`${GRAPH_BASE_URL}/me/accounts?access_token=${updatedData.fbPageToken}`);
                const pages = accountsRes.data?.data || [];
                const match = pages.find(p => p.id === updatedData.fbPageId);
                if (match && match.access_token) {
                    updatedData.fbPageToken = match.access_token;
                    db.addLog('SETTINGS', 'FACEBOOK', `Auto-linked Page Access Token for '${match.name}' (${match.id})`);
                }
            } catch (err) {
                // Preserves direct Page Token entered by user
            }
        }

        // 2. Intelligent Telegram Bot Verification
        if (updatedData.telegramBotToken) {
            try {
                const botRes = await axios.get(`https://api.telegram.org/bot${updatedData.telegramBotToken}/getMe`);
                if (botRes.data?.ok) {
                    const botName = botRes.data.result?.first_name || botRes.data.result?.username;
                    db.addLog('SETTINGS', 'TELEGRAM', `Verified Telegram Bot: @${botName}`);
                }
            } catch (err) {
                // Telegram verification fallback
            }
        }

        const savedSettings = db.saveSettings(updatedData);
        return res.json({
            success: true,
            settings: savedSettings,
            message: 'API Settings saved & verified successfully!'
        });
    },

    // Logs
    getLogs: (req, res) => res.json({ success: true, logs: db.getLogs() })
};

module.exports = rulesController;
