const axios = require('axios');
const db = require('../database/db');

// Official Google Gemini API production models (with robust fallback order)
const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash'
];

/**
 * Short & Concise Islamic Quran & Contextual Fallback Knowledge Engine (20-50 Words)
 */
function getSmartQuranicAIReply(userMessage) {
    const msg = (userMessage || '').toLowerCase().trim();

    // 1. Ayatul Kursi (Surah Al-Baqarah 255)
    if (msg.includes('আয়াতুল কুরসি') || msg.includes('kursi') || (msg.includes('বাকারা') && msg.includes('২৫৫'))) {
        return 'আয়াতুল কুরসির অর্থ: "আল্লাহ! তিনি ব্যতীত কোনো উপাস্য নেই। তিনি চিরঞ্জীব, সর্বসত্তার ধারক। তাঁকে তন্দ্রা ও নিদ্রা স্পর্শ করে না।" (সূরা বাকারা: ২৫৫)';
    }

    // 2. Surah Al-Fatiha
    if (msg.includes('ফাতিহা') || msg.includes('fatiha')) {
        return 'সূরা আল-ফাতিহার অর্থ: "পরম করুণাময় ও অসীম দয়ালু আল্লাহর নামে শুরু করছি। সমস্ত প্রশংসা একমাত্র সৃষ্টিজগতের পালনকর্তা আল্লাহর জন্য।"';
    }

    // 3. Surah Al-Ikhlas
    if (msg.includes('ইখলাস') || msg.includes('ikhlas') || msg.includes('কূল হুওয়াল্লাহ')) {
        return 'সূরা আল-ইখলাসের অর্থ: "বলুন, তিনিই আল্লাহ, একক/অদ্বিতীয়। আল্লাহ কারো মুখাপেক্ষী নন, সকলেই তাঁর মুখাপেক্ষী। তিনি কাউকে জন্ম দেননি এবং তাঁকেও জন্ম দেয়া হয়নি।"';
    }

    // 4. Comment "Amin"
    if (msg.includes('আমিন') || msg.includes('amee') || msg.includes('amin')) {
        return 'আমিন, আল্লাহুম্মা আমিন! মহান আল্লাহ তাআলা আমাদের সকলের নেক দোয়া ও ইবাদত কবুল করুন।';
    }

    // 5. Praise / General Positive Response
    if (msg.includes('মাশাল্লাহ') || msg.includes('আলহামদুলিল্লাহ') || msg.includes('জাজাকাল্লাহ') || msg.includes('সুন্দর') || msg.includes('ধন্যবাদ') || msg.includes('thanks')) {
        return 'জাজাকাল্লাহু খাইরান! আপনার মন্তব্য আমাদের উৎসাহিত করে। মহান আল্লাহ তাআলা আপনাকে উত্তম প্রতিদান দান করুন।';
    }

    // 6. Address / Location Inquiry
    if (msg.includes('ঠিকানা') || msg.includes('location') || msg.includes('কোথায়') || msg.includes('address')) {
        return 'আসসালামু আলাইকুম! এটি "Family\'s" ইসলামী অনলাইন পেজ। আমাদের সমস্ত পণ্য ও পোস্ট অনলাইনে প্রদান করা হয়। বিস্তারিত জানতে আমাদের পেজের সাথেই থাকুন।';
    }

    // 7. General Greetings
    if (msg.includes('সালাম') || msg.includes('salam') || msg.includes('কেমন') || msg.includes('hello') || msg.includes('hi')) {
        return 'ওয়ালাইকুম আসসালাম ওয়া রাহমাতুল্লাহ! আলহামদুলিল্লাহ, আল্লাহর রহমতে আমরা ভালো আছি। আজ আপনাকে কীভাবে সহযোগিতা করতে পারি?';
    }

    // Default Fallback
    return 'আসসালামু আলাইকুম! আমাদের "Family\'s" ইসলামী পেজে আপনাকে স্বাগতম। পবিত্র কুরআনের যেকোনো আয়াতের বাংলা অনুবাদ বা ইসলামিক বিষয় জানতে মেসেজ দিন।';
}

/**
 * Smart Islamic Quran AI Auto-Response Generator using Google Gemini API & Multi-Turn History
 */
async function generateAIReply(userMessage, context = 'Facebook Post Comment', senderId = null, userProfile = null) {
    const settings = db.getSettings();

    // Resolves Gemini API Key from database settings or Vercel process.env variables
    const apiKey = (settings.geminiApiKey && settings.geminiApiKey.trim())
        ? settings.geminiApiKey.trim()
        : (process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || '');

    const isCommentContext = (context && context.toLowerCase().includes('comment'));

    // Fetch conversation history ONLY for private Messenger DMs (never for post comments)
    const history = (senderId && !isCommentContext) ? db.getConversationHistory(senderId, 10) : [];
    const isFirstMessage = (history.length === 0);

    const userName = userProfile?.first_name || '';
    const genderTitle = userProfile?.gender === 'female' ? 'আপু' : 'ভাই';
    const salutation = userName ? `আসসালামু আলাইকুম ${userName} ${genderTitle}!` : `আসসালামু আলাইকুম!`;

    let userIdentityContext = '';
    if (userName) {
        userIdentityContext = `ইউজারের পরিচিতি (মেটা এপিআই থেকে সরাসরি প্রাপ্ত): ইউজারের নাম "${userName}", সম্মানসূচক জেন্ডার: "${genderTitle}"। ইউজার যদি তার নাম কী বা পরিচয় জানতে চায়—স্পষ্ট জানাবেন যে তার নাম ${userName} ${genderTitle}।`;
    }

    let greetingInstruction = (isFirstMessage && !isCommentContext)
        ? `১. ইউজারের এটি মেসেঞ্জারে ১ম বার্তা। বার্তার শুরুতে সুন্দর ইসলামী সালাম ও নামটি দিয়ে সম্ভাষণ জানাবেন (যেমন: "${salutation}")।`
        : "১. মেসেঞ্জারে পূর্বে থেকেই কথা চলছে অথবা পোস্ট কমেন্ট। বারবার সালাম দেওয়ার প্রয়োজন নেই, সরাসরি সংক্ষেপে প্রাকৃতিভাবে উত্তর দিন।";

    // Read Dynamic Product Catalog JSON
    const products = db.getProducts() || [];
    let productCatalogText = '';
    if (products.length > 0) {
        productCatalogText = '\n\nবর্তমানে পেজের লাইভ প্রোডাক্ট ক্যাটালগ ও মূল্য তালিকা:\n' + products.map(p => `- [কোড: ${p.code || 'N/A'}] ${p.title} (${p.category}): মূল্য ${p.price}, স্টক: ${p.stock || 'In Stock'}${p.fbLink ? ' | লিংক: ' + p.fbLink : ''} | বিবরণ: ${p.description}`).join('\n');
    }

    const systemPromptText = `আপনি "Family's" ইসলামী পেজের একজন অত্যন্ত বিজ্ঞ, মার্জিত, সহানুভূতির অধিকারী এবং স্মার্ট ইসলামিক ও সেলস এআই অ্যাসিস্ট্যান্ট।
${userIdentityContext}
${productCatalogText}

আপনার মূল দায়িত্ব:
${greetingInstruction}
২. উত্তর অবশ্যই ২০ থেকে ৫০ শব্দের (20-50 words max, 2-3 short sentences) মধ্যে খুব সংক্ষিপ্ত, স্পষ্ট ও মার্জিত হতে হবে। কোনো বড় প্যারাগ্রাফ লিখবেন না।
৩. ইউজার যদি কুরআনের কোনো আয়াত (Ayah), সূরা বা আয়াতের বাংলা অর্থ জানতে চায়—কুরআন থেকে সরাসরি আয়াতের নির্ভুল বাংলা অনুবাদ ২০-৫০ শব্দে উত্তর দেবেন।
৪. প্রোডাক্ট ও কেনাকাটা: ইউজার যদি কোনো পণ্য, প্রোডাক্ট কোড/মডেল, আতর, তসবিহ, বই বা ক্যাটালগের দাম ও তথ্য জানতে চায়—তবে ক্যাটালগ থেকে পণ্যের কোড (Model Code), নাম, দাম এবং সম্ভব হলে লিংক সহ ২০-৫০ শব্দে উত্তর দেবেন।
৫. কমেন্টের ক্ষেত্রে (Post Comment): ডাইরেক্ট ইনবক্সের কথার ইতিবৃত্ত টানবেন না। ইউজার কমেন্টে যা বলেছে (যেমন: 'আমিন' বা কোনো প্রশংসামূলক মন্তব্য) হুবহু সেই কমেন্টের সংক্ষিপ্ত সুন্দর জবাব দেবেন।
৬. মেসেঞ্জার ডিএম-এর ক্ষেত্রে: পূর্ববর্তী বার্তার প্রেক্ষাপট স্মরণ রেখে সংক্ষেপে ধারাবাহিক উত্তর দেবেন।`;

    const userPromptText = `Additional Context: ${context}\nUser Message/Comment: "${userMessage}"`;

    // Format Multi-Turn Conversation History for Gemini API (DM only)
    const formattedHistory = isCommentContext ? [] : history.map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }]
    }));

    const payload = {
        systemInstruction: {
            parts: [{ text: systemPromptText }]
        },
        contents: [
            ...formattedHistory,
            { role: 'user', parts: [{ text: userPromptText }] }
        ]
    };

    // 1. If no API key set anywhere, return Quranic Fallback Response
    if (!apiKey) {
        console.log('[AI Service] Gemini API Key not found in settings or process.env. Using Islamic Quranic Knowledge Engine.');
        const fallbackReply = getSmartQuranicAIReply(userMessage);
        if (senderId && !isCommentContext) {
            db.addConversationMessage(senderId, 'user', userMessage);
            db.addConversationMessage(senderId, 'model', fallbackReply);
        }
        return fallbackReply;
    }

    // 2. Call Google Gemini API with systemInstruction & Multi-Turn History
    for (const modelName of GEMINI_MODELS) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                payload,
                { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
            );

            const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
                const trimmedText = aiText.trim();
                if (senderId && !isCommentContext) {
                    db.addConversationMessage(senderId, 'user', userMessage);
                    db.addConversationMessage(senderId, 'model', trimmedText);
                }
                console.log(`[AI Service Success] Generated live response via model '${modelName}'`);
                return trimmedText;
            }
        } catch (error) {
            console.log(`[AI Service Notice] Model ${modelName} notice:`, error?.response?.data?.error?.message || error.message);
        }
    }

    // 3. Fallback to Smart Quranic Engine if API fails/timeouts/rate-limited
    console.log('[AI Service Notice] Gemini API rate limited or quota exceeded. Using Smart Quranic Fallback Engine.');
    const fallbackReply = getSmartQuranicAIReply(userMessage);
    if (senderId && !isCommentContext) {
        db.addConversationMessage(senderId, 'user', userMessage);
        db.addConversationMessage(senderId, 'model', fallbackReply);
    }
    return fallbackReply;
}

module.exports = {
    generateAIReply,
    getSmartQuranicAIReply
};
