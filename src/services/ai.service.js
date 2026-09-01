const axios = require('axios');
const db = require('../database/db');

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

/**
 * AI Auto-Response Generator using Google Gemini API
 */
async function generateAIReply(userMessage, context = 'Customer Support & Sales') {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log('[AI Service] Gemini API Key not set. Falling back to default friendly message.');
        return 'Thank you for your message! Our team will get back to you shortly.';
    }

    const customSystemPrompt = settings.systemPrompt || 'You are an intelligent social media customer support AI assistant for our business.';
    const prompt = `System Role & Knowledge Base:\n${customSystemPrompt}\n\nAdditional Event Context: ${context}\nCustomer Message: "${userMessage}"\n\nResponse Guidelines:\n- Answer directly based on the business system instructions above.\n- Keep the reply short, polite, engaging (under 3 sentences).\n- Use appropriate emojis.`;

    for (const modelName of GEMINI_MODELS) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                { contents: [{ parts: [{ text: prompt }] }] },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
            );

            const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
                return aiText.trim();
            }
        } catch (error) {
            console.log(`[AI Service Notice] Model ${modelName} returned notice. Trying fallback model...`);
        }
    }

    return 'Thank you for reaching out! How can we assist you today?';
}

module.exports = { generateAIReply };
