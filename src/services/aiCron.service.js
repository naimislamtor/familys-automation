const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const facebookService = require('./facebook.service');
const instagramService = require('./instagram.service');
const telegramService = require('./telegram.service');
const linkedinService = require('./linkedin.service');

// Google Gemini Models to try in fallback order
const GEMINI_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite'
];

/**
 * Generate Content & Card Structure for ANY Custom Topic Prompt
 */
async function generateContentAndImageForTopic(userTopicPrompt) {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    let postText = '';
    let cardBadge = '✨ DAILY UPDATE';
    let cardLine1 = '';
    let cardLine2 = '';
    let cardLine3 = '';
    let cardSubText = '';

    const cleanTopic = userTopicPrompt || 'Daily motivational quote for success';

    if (apiKey) {
        const systemPrompt = `You are an expert social media content creator. Generate an engaging Bengali social media post and an AI graphic banner layout based on the user topic below.

User Requested Topic: "${cleanTopic}"

Return ONLY a valid JSON object with these fields:
1. "postText": A beautifully formatted Bengali social media post with emoji headers and 4 relevant hashtags.
2. "cardBadge": A short 2-3 word category badge title (e.g. "🕌 কুরআনের বাণী", "🚀 টেকনোলজি নিউজ", "✨ আজকের চিন্তা").
3. "cardLine1": First line of main headline/quote in Bengali (max 6 words).
4. "cardLine2": Second line of main headline/quote in Bengali (max 6 words).
5. "cardLine3": Highlights or punchline in Bengali (max 5 words).
6. "cardSubText": Short reflection or summary line in Bengali (max 8 words).

Example JSON output:
{
  "postText": "✨ **আজকের বার্তা**\\n\\nনতুন দিনে নতুন পথ চলা...",
  "cardBadge": "✨ আজকের চিন্তা",
  "cardLine1": "প্রতিটি নতুন দিন",
  "cardLine2": "একটি নতুন সুযোগ",
  "cardLine3": "আজই শুরু করুন!",
  "cardSubText": "কখনো আশা হারাবেন না"
}`;

        for (const modelName of GEMINI_MODELS) {
            try {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                    { contents: [{ parts: [{ text: systemPrompt }] }] },
                    { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
                );

                const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (rawText) {
                    try {
                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            if (parsed.postText) postText = parsed.postText;
                            if (parsed.cardBadge) cardBadge = parsed.cardBadge;
                            if (parsed.cardLine1) cardLine1 = parsed.cardLine1;
                            if (parsed.cardLine2) cardLine2 = parsed.cardLine2;
                            if (parsed.cardLine3) cardLine3 = parsed.cardLine3;
                            if (parsed.cardSubText) cardSubText = parsed.cardSubText;
                        }
                    } catch (jsonErr) {}

                    if (!postText) {
                        postText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
                    }
                    if (postText) break;
                }
            } catch (err) {
                console.log(`[AI Text Generation Notice] Model ${modelName} notice:`, err?.response?.data?.error?.message || err.message);
            }
        }
    }

    // Dynamic text fallback if no API key or network glitch
    if (!postText) {
        postText = `✨ **${cleanTopic}**\n\nপ্রতিটি লক্ষ্যের পেছনে থাকে অবিরাম চেষ্টা ও সঠিক দিকনির্দেশনা। নিজের কাজের প্রতি সততা রাখুন এবং প্রতিদিন এক ধাপ এগিয়ে যান!\n\n#DailyUpdate #Inspiration #Success #Goals`;
        cardLine1 = cleanTopic;
        cardLine2 = 'আজই শুরু করুন আপনার যাত্রা';
        cardLine3 = 'সাফল্য আপনারই হবে!';
    }

    const cardData = {
        line1: cardLine1 || cleanTopic,
        line2: cardLine2 || '',
        line3: cardLine3 || '',
        subText: cardSubText || '',
        badgeText: cardBadge || '✨ FAMILY\'S POST'
    };

    return { postText, cardData };
}

/**
 * Executes an AI post creation for a specific or saved prompt
 */
async function executeDailyAIPost(customPromptOverride = null) {
    const settings = db.getSettings();
    const prompt = customPromptOverride || settings.aiCronPrompt || 'Motivational daily advice for success and productivity';
    const targetPlatforms = settings.aiCronPlatforms || ['FACEBOOK', 'INSTAGRAM', 'TELEGRAM'];

    console.log('[AI Autonomous Post] Generating AI post for topic:', prompt);
    db.addLog('POST', 'ALL', `Generating AI Post for topic: "${prompt.substring(0, 60)}..."`);

    // 1. Generate text & AI Graphic Card Data
    const { postText, cardData } = await generateContentAndImageForTopic(prompt);

    // 2. Save post entry to DB
    const savedPost = db.savePost({
        message: postText,
        targetPlatforms,
        isAutonomousAIPost: true,
        status: 'PUBLISHED'
    });

    db.addLog('POST', 'ALL', 'Autonomous AI Daily Post created!');
    return savedPost;
}

/**
 * Initializes Background Cron Scheduler that checks every 60s
 */
function initAICronScheduler() {
    console.log('[AI Cron Scheduler] Initialized background check runner (60s tick)...');

    setInterval(async () => {
        try {
            const settings = db.getSettings();
            if (!settings.aiCronEnabled) return;

            const now = new Date();
            const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const todayYYYYMMDD = now.toISOString().split('T')[0];

            if (currentHHMM === settings.aiCronTime && settings.aiCronLastRunDate !== todayYYYYMMDD) {
                db.saveSettings({ aiCronLastRunDate: todayYYYYMMDD });
                console.log(`[AI Cron Scheduler] Triggering Scheduled Daily AI Post for time ${currentHHMM}...`);
                await executeDailyAIPost();
            }
        } catch (err) {
            console.error('[AI Cron Scheduler Error]:', err.message);
        }
    }, 60000);
}

module.exports = {
    initAICronScheduler,
    executeDailyAIPost,
    generateContentAndImageForTopic
};
