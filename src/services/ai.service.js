const axios = require('axios');
const db = require('../database/db');

// Official Google Gemini API production models
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash-lite'
];

const DEFAULT_BUSINESS_PROMPT = `আপনি "Family's" ব্র্যান্ডের একজন অত্যন্ত পারদর্শী, অমায়িক ও সাহায্যকারী স্মার্ট কাস্টমার সাপোর্ট ও সেলস রিপ্রেজেন্টেটিভ।

মূল নিয়মাবলী:
১. গ্রাহকের যেকোনো প্রশ্নের উত্তর ১০০% বিশুদ্ধ, মিষ্টি ও ঝরঝরে বাংলায় দেবেন।
২. উত্তর অবশ্যই ২ থেকে ৩ লাইনের মধ্যে ছোট, স্পষ্ট ও আকর্ষণীয় হতে হবে।
৩. কাস্টমারকে যথাযথ তথ্য ও সম্মান জানিয়ে অর্ডার করতে বা যেকোনো প্রয়োজনে সহযোগিতা করবেন।
৪. কোনো অনাকাঙ্ক্ষিত বিষয় এড়িয়ে ব্যবসায়িক বিষয়টিতে মনোনিবেশ করবেন।`;

/**
 * Smart Conversational Knowledge Engine for Instant Relevant Responses
 */
function getSmartContextualReply(userMessage) {
    const msg = (userMessage || '').toLowerCase().trim();

    // General Knowledge / Custom Questions
    if (msg.includes('রাজধানী') || msg.includes('ঢাকা') || msg.includes('bangladesh') || msg.includes('capital')) {
        return 'বাংলাদেশের রাজধানী হলো ঢাকা। আমাদের অনলাইন শপ থেকে সারা বাংলাদেশে যেকোনো স্থানে হোম ডেলিভারি সুবিধা রয়েছে!';
    }
    if (msg.includes('কেমন') || msg.includes('ভালো') || msg.includes('how are you')) {
        return 'আলহামদুলিল্লাহ, আমরা ভালো আছি! আপনি কেমন আছেন? আজ আপনাকে কীভাবে সাহায্য করতে পারি জানান।';
    }
    if (msg.includes('দাম') || msg.includes('মূল্য') || msg.includes('price')) {
        return 'আমাদের সেরা অফার প্রাইস ও প্রডাক্টের বিবরণ জানতে আপনার পছন্দের পন্যের ছবি বা নামটি জানান। আজই সেরা মূল্যে অর্ডার করতে আমাদের সাথে থাকুন!';
    }
    if (msg.includes('অর্ডার') || msg.includes('কিনবো') || msg.includes('order') || msg.includes('ডেলিভারি')) {
        return 'অর্ডার কনফার্ম করার জন্য আপনার নাম, সম্পূর্ণ ঠিকানা ও মোবাইল নাম্বারটি আমাদের ইনবক্সে দিয়ে দিন। আমরা খুব দ্রুত ডেলিভারি সম্পন্ন করবো!';
    }
    if (msg.includes('নাম্বার') || msg.includes('ফোন') || msg.includes('কল') || msg.includes('হোয়াটসঅ্যাপ') || msg.includes('whatsapp')) {
        return 'আমাদের কাস্টমার কেয়ারে সরাসরি কথা বলতে বা অর্ডারের অগ্রগতি জানতে ইনবক্সে আপনার যোগাযোগের নাম্বারটি জানান, আমরা আপনাকে কল দিচ্ছি!';
    }
    if (msg.includes('লোকেশন') || msg.includes('ঠিকানা') || msg.includes('কোথায় শপ') || msg.includes('location')) {
        return 'আমাদের অনলাইন শপ থেকে সারা বাংলাদেশে ক্যাশ অন ডেলিভারিতে পণ্য পৌঁছে দেওয়া হয়। আপনার ঠিকানা দিয়ে আজই নিশ্চিন্তে অর্ডার করুন!';
    }
    if (msg.includes('ধন্যবাদ') || msg.includes('thanks') || msg.includes('thank you')) {
        return 'আপনাকেও অনেক অনেক ধন্যবাদ! আপনার শুভকামনা আমাদের অনুপ্রেরণা। যেকোনো প্রয়োজনে আমরা সবসময় আপনার সেবায় নিয়োজিত।';
    }

    return 'আমাদের সাথে যোগাযোগ করার জন্য আপনাকে অসংখ্য ধন্যবাদ! আপনার বার্তাটির বিষয়ে আমাদের টিম আপনাকে সর্বাত্মক সহযোগিতা করার জন্য প্রস্তুত রয়েছে।';
}

/**
 * Smart AI Auto-Response Generator using Google Gemini API & Knowledge Base Engine
 */
async function generateAIReply(userMessage, context = 'Customer Support & Sales') {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    // 1. If no API key set, return smart contextual Bengali response instantly
    if (!apiKey) {
        console.log('[AI Service] Gemini API Key not set. Using smart contextual Bengali knowledge base.');
        return getSmartContextualReply(userMessage);
    }

    // 2. Call Google Gemini API with valid production model names
    const customSystemPrompt = settings.systemPrompt || DEFAULT_BUSINESS_PROMPT;
    const prompt = `System Role & Knowledge Base:\n${customSystemPrompt}\n\nAdditional Event Context: ${context}\nCustomer Message: "${userMessage}"\n\nResponse Guidelines:\n- Respond strictly in fluent, natural Bengali.\n- Keep the response polite, concise, and helpful (under 3 sentences).\n- Focus on assisting the customer with sales, orders, and inquiries.`;

    for (const modelName of GEMINI_MODELS) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                { contents: [{ parts: [{ text: prompt }] }] },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            );

            const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
                return aiText.trim();
            }
        } catch (error) {
            console.log(`[AI Service Notice] Model ${modelName} notice:`, error?.response?.data?.error?.message || error.message);
        }
    }

    // Fallback if API fails or rate limits
    return getSmartContextualReply(userMessage);
}

module.exports = { generateAIReply };
