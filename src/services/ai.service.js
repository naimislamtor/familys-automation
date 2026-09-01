const axios = require('axios');
const db = require('../database/db');

const GEMINI_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite'
];

const DEFAULT_BUSINESS_PROMPT = `আপনি "Family's" ব্র্যান্ডের একজন অত্যন্ত পারদর্শী, অমায়িক ও সাহায্যকারী স্মার্ট কাস্টমার সাপোর্ট ও সেলস রিপ্রেজেন্টেটিভ।

মূল নিয়মাবলী:
১. গ্রাহকের যেকোনো প্রশ্নের উত্তর ১০০% বিশুদ্ধ, মিষ্টি ও ঝরঝরে বাংলায় দেবেন।
২. উত্তর অবশ্যই ২ থেকে ৩ লাইনের মধ্যে ছোট, স্পষ্ট ও আকর্ষণীয় হতে হবে।
৩. কাস্টমারকে যথাযথ তথ্য ও সম্মান জানিয়ে অর্ডার করতে বা যেকোনো প্রয়োজনে সহযোগিতা করবেন।
৪. কোনো অযাচিত বা অনাকাঙ্ক্ষিত বিষয় এ এড়িয়ে ব্যবসায়িক বিষয়টিতে মনোনিবেশ করবেন।`;

const BENGALI_FALLBACK_REPLIES = [
    'আমাদের সাথে যোগাযোগ করার জন্য আপনাকে আন্তরিক ধন্যবাদ! আপনার বার্তাটি আমরা পেয়েছি, যেকোনো প্রশ্ন বা অর্ডারের জন্য আমাদের সাথেই থাকুন।',
    'ধন্যবাদ আপনার সুন্দর বার্তার জন্য! আমাদের প্রোডাক্ট বা সার্ভিস সম্পর্কিত তথ্য পেতে আমাদের টিম আপনাকে সর্বাত্মক সহযোগিতা করতে প্রস্তুত।',
    'আমাদের পেজে আপনাকে স্বাগতম! আপনার প্রশ্নটির বিষয়ে অতি দ্রুত আমাদের কাস্টমার সাপোর্ট টিম আপনাকে বিস্তারিত তথ্য জানিয়ে দেবে।'
];

/**
 * Smart AI Auto-Response Generator using Google Gemini API
 */
async function generateAIReply(userMessage, context = 'Customer Support & Sales') {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    const randomFallback = BENGALI_FALLBACK_REPLIES[Math.floor(Math.random() * BENGALI_FALLBACK_REPLIES.length)];

    if (!apiKey) {
        console.log('[AI Service] Gemini API Key not set. Returning smart Bengali customer reply.');
        return randomFallback;
    }

    const customSystemPrompt = settings.systemPrompt || DEFAULT_BUSINESS_PROMPT;
    const prompt = `System Role & Knowledge Base:\n${customSystemPrompt}\n\nAdditional Event Context: ${context}\nCustomer Message: "${userMessage}"\n\nResponse Guidelines:\n- Respond strictly in fluent, natural Bengali.\n- Keep the response polite, concise, and helpful (under 3 sentences).\n- Focus on assisting the customer with sales, orders, and inquiries.`;

    for (const modelName of GEMINI_MODELS) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                { contents: [{ parts: [{ text: prompt }] }] },
                { headers: { 'Content-Type': 'application/json' }, timeout: 3000 }
            );

            const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
                return aiText.trim();
            }
        } catch (error) {
            console.log(`[AI Service Notice] Model ${modelName} notice:`, error?.response?.data?.error?.message || error.message);
        }
    }

    return randomFallback;
}

module.exports = { generateAIReply };
