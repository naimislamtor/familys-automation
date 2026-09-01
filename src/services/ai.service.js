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
 * Comprehensive Smart Conversational Knowledge Engine for Any Incoming Question
 */
function getSmartContextualReply(userMessage) {
    const msg = (userMessage || '').toLowerCase().trim();

    // 1. Identity & Name
    if (msg.includes('নাম') || msg.includes('কে আপনি') || msg.includes('who are you') || msg.includes('identity')) {
        return 'আমি "Family\'s" পেজের স্মার্ট ডিজিটাল কাস্টমার অ্যাসিস্ট্যান্ট! যেকোনো প্রশ্ন, তথ্য বা অর্ডারের জন্য আমি আপনাকে সাহায্য করতে পারি।';
    }

    // 2. Weather & Daily Chat
    if (msg.includes('আবহাওয়া') || msg.includes('বৃষ্টি') || msg.includes('রোড') || msg.includes('weather')) {
        return 'আজকের দিনের জন্য শুভকামনা! আপনার দিনটি সুন্দর ও সাফল্যমণ্ডিত হোক। আমাদের পেজে আপনাকে স্বাগত জানাচ্ছি!';
    }

    // 3. Greetings & Well-being
    if (msg.includes('কেমন') || msg.includes('ভালো') || msg.includes('আছেন') || msg.includes('how are you') || msg.includes('হাই') || msg.includes('হ্যালো') || msg.includes('hello') || msg.includes('hi')) {
        return 'আলহামদুলিল্লাহ, আমরা ভালো আছি! আশা করি আপনিও ভালো আছেন। আজ আপনাকে কীভাবে সহযোগিতা করতে পারি জানান!';
    }

    // 4. General Knowledge / Bangladesh / Capital / Location
    if (msg.includes('রাজধানী') || msg.includes('ঢাকা') || msg.includes('bangladesh') || msg.includes('capital') || msg.includes('বাংলাদেশ')) {
        return 'বাংলাদেশের রাজধানী হলো ঢাকা। আমাদের অনলাইন পেজ থেকে সারা বাংলাদেশে যেকোনো স্থানে হোম ডেলিভারি সুবিধা রয়েছে!';
    }

    // 5. Price & Product Inquiry
    if (msg.includes('দাম') || msg.includes('মূল্য') || msg.includes('price') || msg.includes('কত') || msg.includes('টাকা') || msg.includes('রেট')) {
        return 'আমাদের সেরা অফার প্রাইস ও প্রডাক্টের বিবরণ জানতে আপনার পছন্দের প্রোডাক্টের নাম বা ছবিটি পাঠান। আজই আকর্ষণীয় মূল্যে অর্ডার কনফার্ম করুন!';
    }

    // 6. Order & Delivery Process
    if (msg.includes('অর্ডার') || msg.includes('কিনবো') || msg.includes('order') || msg.includes('ডেলিভারি') || msg.includes('কুরিয়ার')) {
        return 'অর্ডার কনফার্ম করার জন্য আপনার নাম, সম্পূর্ণ এলাকা/ঠিকানা ও একটি সচল মোবাইল নাম্বার আমাদের ইনবক্সে লিখে দিন। আমরা খুব দ্রুত ডেলিভারি সম্পন্ন করবো!';
    }

    // 7. Contact & Phone / WhatsApp
    if (msg.includes('নাম্বার') || msg.includes('ফোন') || msg.includes('কল') || msg.includes('হোয়াটসঅ্যাপ') || msg.includes('whatsapp') || msg.includes('contact')) {
        return 'আমাদের কাস্টমার সাপোর্ট টিমের সাথে সরাসরি কথা বলতে বা অর্ডারের বিষয়ে জানতে ইনবক্সে আপনার যোগাযোগের নাম্বারটি জানান, আমরা আপনাকে কল দিচ্ছি!';
    }

    // 8. Physical Shop & Location
    if (msg.includes('লোকেশন') || msg.includes('ঠিকানা') || msg.includes('শপ') || msg.includes('দোকান') || msg.includes('location') || msg.includes('address')) {
        return 'আমাদের সার্ভিস মূলত অনলাইন ভিত্তিক এবং সারা বাংলাদেশে ক্যাশ অন ডেলিভারিতে পণ্য পৌঁছে দেওয়া হয়। আপনার ঠিকানা দিয়ে নিশ্চিন্তে অর্ডার করুন!';
    }

    // 9. Gratitude & Courtesy
    if (msg.includes('ধন্যবাদ') || msg.includes('thanks') || msg.includes('thank you') || msg.includes('শুভেচ্ছা')) {
        return 'আপনাকেও অনেক অনেক ধন্যবাদ! আপনার শুভকামনা আমাদের অনুপ্রেরণা। যেকোনো প্রয়োজনে আমরা সবসময় আপনার সেবায় প্রস্তুত।';
    }

    // 10. General Dynamic Smart Conversation Fallback
    const dynamicReplies = [
        'আপনার সুন্দর বার্তার জন্য ধন্যবাদ! আপনার অনুসন্ধানের বিষয়ে আমাদের প্রতিনিধি খুব দ্রুতই আপনাকে বিস্তারিত তথ্য দিয়ে সাহায্য করবেন।',
        'আমাদের পেজে আপনাকে সুস্বাগতম! আপনার কাঙ্ক্ষিত তথ্য বা অর্ডারের বিষয়ে আমাদের জানান, আমরা আপনাকে সর্বাত্মক সহযোগিতা করতে প্রস্তুত।',
        'আপনার বার্তাটি আমাদের কাছে পৌঁছেছে। আমাদের সাথে থাকার জন্য ধন্যবাদ, যেকোনো প্রশ্ন বা তথ্যের জন্য আমাদের ইনবক্সে সাথে থাকুন!'
    ];
    return dynamicReplies[Math.floor(Math.random() * dynamicReplies.length)];
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
