const axios = require('axios');
const db = require('../database/db');

// Official Google Gemini API production models
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash-lite'
];

const DEFAULT_ISLAMIC_AI_PROMPT = `আপনি "Family's" ইসলামী পেজের একজন অত্যন্ত সুন্নতি, বিনম্র, আন্তরিক, হাসি-খুশি ও বন্ধুভাবাপন্ন ইসলামী এআই অ্যাসিস্ট্যান্ট।

আপনার চরিত্র ও উত্তর দেওয়ার নিয়মাবলী:
১. ইউজার যেকোনো প্রশ্ন বা বার্তা পাঠাক—আপনি অত্যন্ত আন্তরিকভাবে খাঁটি বাংলায় চমৎকার ২ থেকে ৩ লাইনে উত্তর দেবেন।
২. আপনার কথা হবে অত্যন্ত মার্জিত, প্রাণবন্ত, হৃদয়গ্রাহী ও ইসলামী মূল্যবোধসম্পন্ন।
৩. দ্বীনি বিষয়, ইসলামিক নসিহত, কুশলাদি বিনিময়, দৈনন্দিন জীবন বা সাধারণ জ্ঞান সম্পর্কিত যেকোনো প্রশ্নের সুন্দর ও আনন্দদায়ক উত্তর দেবেন।
৪. কোনো পণ্য বিক্রি, অর্ডার বা ডেলিভারির কথা বলবেন না (কারণ এটি একটি ধর্মীয় ও ইসলামিক পেজ)।`;

/**
 * Islamic Friendly Conversational AI Knowledge Engine
 */
function getSmartIslamicAIReply(userMessage) {
    const msg = (userMessage || '').toLowerCase().trim();

    // 1. Identity & Purpose
    if (msg.includes('নাম') || msg.includes('কে আপনি') || msg.includes('who are you') || msg.includes('identity') || msg.includes('পরিচয়')) {
        return 'আমি "Family\'s" পেজের বন্ধুভাবাপন্ন ইসলামিক এআই অ্যাসিস্ট্যান্ট! দ্বীনি নসিহত, ইসলামিক আলোচনা ও যেকোনো সুন্দর কথার জন্য আমি সবসময় আপনার পাশে আছি।';
    }

    // 2. Greetings & Well-being
    if (msg.includes('কেমন') || msg.includes('ভালো') || msg.includes('আছেন') || msg.includes('how are you') || msg.includes('হাই') || msg.includes('হ্যালো') || msg.includes('hi') || msg.includes('hello')) {
        return 'আলহামদুলিল্লাহ, আল্লাহর অশেষ রহমতে আমরা খুব ভালো আছি! আশা করি আপনিও ঈমান ও স্বাস্থ্যে ভালো আছেন। আজ আপনার দিনটি কেমন কাটছে?';
    }

    // 3. Islamic Reminders & Dhikr
    if (msg.includes('নসিহত') || msg.includes('ইসলাম') || msg.includes('হাদিস') || msg.includes('দোয়া') || msg.includes('জিকির') || msg.includes('সুন্নাহ')) {
        return 'রাসূলুল্লাহ (সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম) বলেছেন: "যে ব্যক্তি আল্লাহর প্রতি ও শেষ দিবসের প্রতি ঈমান রাখে, সে যেন ভালো কথা বলে অথবা চুপ থাকে।" আল্লাহ আমাদের সৎ পথে পরিচালিত করুন!';
    }

    // 4. Weather & Daily Friendly Chat
    if (msg.includes('আবহাওয়া') || msg.includes('বৃষ্টি') || msg.includes('গরম') || msg.includes('দিন') || msg.includes('weather')) {
        return 'আল্লাহ তাআলার প্রতিটি সৃষ্টি ও আবহাওয়ায় রয়েছে মহান শিক্ষা। আজকের সুন্দর দিনটির জন্য আলহামদুলিল্লাহ! আপনার দিনটি বরকতময় হোক।';
    }

    // 5. General Knowledge & Capital
    if (msg.includes('রাজধানী') || msg.includes('ঢাকা') || msg.includes('bangladesh') || msg.includes('capital') || msg.includes('বাংলাদেশ')) {
        return 'বাংলাদেশের রাজধানী হলো নদীমাতৃক ঐতিহাসিক শহর ঢাকা। আল্লাহ আমাদের প্রিয় মাতৃভূমি বাংলাদেশকে শান্তিময় ও সমৃদ্ধ করুন!';
    }

    // 6. Gratitude & Courtesy
    if (msg.includes('ধন্যবাদ') || msg.includes('thanks') || msg.includes('thank you') || msg.includes('জাজাকাল্লাহ')) {
        return 'জাজাকাল্লাহু খাইরান! আপনার সুন্দর কথার জন্য অনেক ধন্যবাদ। আল্লাহ আপনাকে উত্তম প্রতিদান দান করুন এবং সর্বদা সুখে শান্তিতে রাখুন!';
    }

    // 7. General Friendly Islamic Chat Fallback
    const friendlyReplies = [
        'আমাদের "Family\'s" পেজে আপনাকে স্বাগতম! আপনার সুন্দর বার্তার জন্য জাজাকাল্লাহু খাইরান। দ্বীনি আলোচনা ও সুন্দর ভাব বিনিময়ে আমরা সবসময় পাশে আছি।',
        'আলহামদুলিল্লাহ! আপনার বার্তাটি আমাদের হৃদয় ছুঁয়ে গেছে। পরম করুণাময় আল্লাহ তাআলা আপনাকে ও আপনার পরিবারকে সর্বদা হেফাজতে রাখুন।',
        'আপনার সাথে কথা বলতে পেরে আমরা সত্যিই আনন্দিত। পরম করুণাময়ের রহমত ও বরকত সবসময় আপনার উপর বর্ষিত হোক!'
    ];
    return friendlyReplies[Math.floor(Math.random() * friendlyReplies.length)];
}

/**
 * Islamic AI Auto-Response Generator using Google Gemini API
 */
async function generateAIReply(userMessage, context = 'Islamic Page Friendly Chat') {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    // 1. If no API key set, return Islamic Friendly AI reply
    if (!apiKey) {
        console.log('[AI Service] Gemini API Key not set. Using Islamic Friendly AI knowledge base.');
        return getSmartIslamicAIReply(userMessage);
    }

    // 2. Call Google Gemini API with Islamic Friendly System Prompt
    const customSystemPrompt = settings.systemPrompt || DEFAULT_ISLAMIC_AI_PROMPT;
    const prompt = `System Role & Knowledge Base:\n${customSystemPrompt}\n\nAdditional Context: ${context}\nUser Message: "${userMessage}"\n\nResponse Guidelines:\n- Respond strictly in fluent, polite, engaging, Islamic-friendly Bengali.\n- Keep the response warm, polite, concise (under 3 sentences).\n- DO NOT mention products, prices, or orders.\n- Focus on Islamic warmth, friendly chat, advice, and answering questions intelligently.`;

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

    return getSmartIslamicAIReply(userMessage);
}

module.exports = { generateAIReply };
