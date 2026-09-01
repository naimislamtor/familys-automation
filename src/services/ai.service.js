const axios = require('axios');
const db = require('../database/db');

// Official Google Gemini API production models
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash-lite'
];

const ISLAMIC_QURAN_SYSTEM_PROMPT = `আপনি "Family's" ইসলামী পেজের একজন অত্যন্ত বিজ্ঞ, মার্জিত, সহানুভূতির অধিকারী এবং স্মার্ট ইসলামিক এআই অ্যাসিস্ট্যান্ট।

আপনার মূল দায়িত্ব:
১. ইউজার যদি পবিত্র কুরআনের কোনো আয়াত (Ayah), সূরা (Surah) বা আয়াতের বাংলা অর্থ/ব্যাখ্যা জানতে চায়—তবে আপনি কুরআন থেকে সরাসরি সেই আয়াতের নির্ভুল বাংলা অনুবাদ ও শিক্ষা খুব সুন্দর করে ২-৩ লাইনে উত্তর দেবেন।
২. ইউজার যদি কোনো হাদিস, ইসলামিক মাসআলা, নসিহত বা ধর্মীয় প্রশ্ন জিজ্ঞেস করে—তার সঠিক ও নির্ভরযোগ্য ইসলামী জবাব দেবেন।
৩. ইউজার যদি সাধারণ কুশলাদি বিনিময় করে—আপনি সুন্নতি ইসলামী সালাম ও ভালোবাসাপূর্ণ সম্ভাষণ দেবেন।
৪. উত্তর সবসময় খাঁটি বাংলায় অত্যন্ত মার্জিত, হৃদয়গ্রাহী ও স্পষ্টভাষায় দেবেন।
৫. কোনো পণ্য বিক্রি, অর্ডার বা দোকানের কথা কখনোই বলবেন না।`;

/**
 * Islamic Quran & Contextual Fallback Knowledge Engine
 */
function getSmartQuranicAIReply(userMessage) {
    const msg = (userMessage || '').toLowerCase().trim();

    // 1. Ayatul Kursi (Surah Al-Baqarah 255)
    if (msg.includes('আয়াতুল কুরসি') || msg.includes('kursi') || (msg.includes('বাকারা') && msg.includes('২৫৫'))) {
        return 'আয়াতুল কুরসির অর্থ: "আল্লাহ! তিনি ব্যতীত কোনো উপাস্য নেই। তিনি চিরঞ্জীব, সর্বসত্তার ধারক। তাঁকে তন্দ্রা ও নিদ্রা স্পর্শ করে না।" (সূরা বাকারা: ২৫৫)';
    }

    // 2. Surah Al-Fatiha
    if (msg.includes('ফাতিহা') || msg.includes('fatiha')) {
        return 'সূরা আল-ফাতিহার ১ম ও ২য় আয়াতের অর্থ: "পরম করুণাময় ও অসীম দয়ালু আল্লাহর নামে শুরু করছি। সমস্ত প্রশংসা একমাত্র সৃষ্টিজগতের পালনকর্তা আল্লাহর জন্য।"';
    }

    // 3. Surah Al-Ikhlas
    if (msg.includes('ইখলাস') || msg.includes('ikhlas') || msg.includes('কূল হুওয়াল্লাহ')) {
        return 'সূরা আল-ইখলাসের অর্থ: "বলুন, তিনিই আল্লাহ, একক/অদ্বিতীয়। আল্লাহ কারো মুখাপেক্ষী নন, সকলেই তাঁর মুখাপেক্ষী। তিনি কাউকে জন্ম দেননি এবং তাঁকেও জন্ম দেয়া হয়নি।"';
    }

    // 4. Quran Ayah general query
    if (msg.includes('আয়াত') || msg.includes('সূরা') || msg.includes('অনুবাদ') || msg.includes('অর্থ') || msg.includes('কুরআন')) {
        return 'পবিত্র কুরআনের যে আয়াতের বা সূরার বাংলা অর্থ জানতে চান, সূরা বা আয়াতের নাম/নম্বর লিখে ইনবক্সে পাঠান। আমি আপনাকে আয়াতের অর্থ জানিয়ে দিচ্ছি!';
    }

    // 5. Greetings & Well-being
    if (msg.includes('কেমন') || msg.includes('ভালো') || msg.includes('আছেন') || msg.includes('how are you') || msg.includes('হাই') || msg.includes('হ্যালো')) {
        return 'আলহামদুলিল্লাহ, আল্লাহর অশেষ রহমতে আমরা ভালো আছি! পবিত্র কুরআনের যেকোনো আয়াত, সূরা বা ইসলামিক প্রশ্নের জন্য আমাদের জানান।';
    }

    // 6. Gratitude
    if (msg.includes('ধন্যবাদ') || msg.includes('thanks') || msg.includes('জাজাকাল্লাহ')) {
        return 'জাজাকাল্লাহু খাইরান! আল্লাহ আপনাকে পবিত্র কুরআনের আলোয় জীবন গড়ার তৌফিক দান করুন।';
    }

    // 7. Dynamic Quranic Default Response
    return 'আমাদের "Family\'s" ইসলামী পেজে আপনাকে স্বাগতম! কুরআনের যেকোনো আয়াতের বাংলা অনুবাদ বা ইসলামিক আলোচনার জন্য আপনার প্রশ্নটি জানান।';
}

/**
 * Smart Islamic Quran AI Auto-Response Generator using Google Gemini API
 */
async function generateAIReply(userMessage, context = 'Islamic Quran & Knowledge Assistant') {
    const settings = db.getSettings();
    
    // Resolves Gemini API Key from database settings or Vercel process.env variables
    const apiKey = (settings.geminiApiKey && settings.geminiApiKey.trim())
        ? settings.geminiApiKey.trim()
        : (process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || '');

    // 1. If no API key set anywhere, return Quranic Fallback Response
    if (!apiKey) {
        console.log('[AI Service] Gemini API Key not found in settings or process.env. Using Islamic Quranic Knowledge Engine.');
        return getSmartQuranicAIReply(userMessage);
    }

    // 2. Call Google Gemini API with Islamic Quran System Prompt
    const customSystemPrompt = settings.systemPrompt || ISLAMIC_QURAN_SYSTEM_PROMPT;
    const prompt = `System Role & Knowledge Base:\n${customSystemPrompt}\n\nAdditional Context: ${context}\nUser Request: "${userMessage}"\n\nResponse Guidelines:\n- If the user asks for a Quran verse/Ayah/Surah translation, provide the exact accurate Bengali translation of that Ayah in 2-3 lines.\n- If the user asks an Islamic question, provide a correct, polite Islamic answer in Bengali.\n- Keep response warm, respectful, concise (under 3 sentences).\n- DO NOT mention products, prices, or orders.`;

    for (const modelName of GEMINI_MODELS) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                { contents: [{ parts: [{ text: prompt }] }] },
                { headers: { 'Content-Type': 'application/json' }, timeout: 6000 }
            );

            const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
                return aiText.trim();
            }
        } catch (error) {
            console.log(`[AI Service Notice] Model ${modelName} notice:`, error?.response?.data?.error?.message || error.message);
        }
    }

    return getSmartQuranicAIReply(userMessage);
}

module.exports = { generateAIReply };
