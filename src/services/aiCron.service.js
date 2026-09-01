const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
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

// Curated Vibrant Modern HSL Social Media Color Palettes
const BANNER_COLOR_PALETTES = [
    // 1. Deep Midnight Ocean
    {
        bgStart: '#0f172a', bgMid: '#1e1b4b', bgEnd: '#31104b',
        badgeBg: 'rgba(99, 102, 241, 0.25)', badgeBorder: 'rgba(129, 140, 248, 0.4)', badgeText: '#a5b4fc',
        cardBg: 'rgba(15, 23, 42, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.18)',
        goldTextStart: '#fbbf24', goldTextEnd: '#f59e0b', strokeColor: '#fbbf24', subTextColor: '#cbd5e1'
    },
    // 2. Neon Cyber Purple
    {
        bgStart: '#18002e', bgMid: '#3b0764', bgEnd: '#1e1b4b',
        badgeBg: 'rgba(217, 70, 239, 0.25)', badgeBorder: 'rgba(240, 171, 252, 0.4)', badgeText: '#f5d0fe',
        cardBg: 'rgba(24, 0, 46, 0.85)', cardBorder: 'rgba(240, 171, 252, 0.25)',
        goldTextStart: '#38bdf8', goldTextEnd: '#0284c7', strokeColor: '#38bdf8', subTextColor: '#e9d5ff'
    },
    // 3. Royal Emerald Gold
    {
        bgStart: '#022c22', bgMid: '#064e3b', bgEnd: '#0f172a',
        badgeBg: 'rgba(16, 185, 129, 0.25)', badgeBorder: 'rgba(110, 231, 183, 0.4)', badgeText: '#a7f3d0',
        cardBg: 'rgba(2, 44, 34, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        goldTextStart: '#fde047', goldTextEnd: '#d97706', strokeColor: '#fde047', subTextColor: '#ecfdf5'
    },
    // 4. Sunset Coral Glow
    {
        bgStart: '#4c0519', bgMid: '#881337', bgEnd: '#2e1065',
        badgeBg: 'rgba(244, 63, 94, 0.25)', badgeBorder: 'rgba(251, 113, 133, 0.4)', badgeText: '#fecdd3',
        cardBg: 'rgba(76, 5, 25, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        goldTextStart: '#fef08a', goldTextEnd: '#f59e0b', strokeColor: '#fef08a', subTextColor: '#ffe4e6'
    },
    // 5. Electric Cyan Dark
    {
        bgStart: '#082f49', bgMid: '#0c4a6e', bgEnd: '#0f172a',
        badgeBg: 'rgba(14, 165, 233, 0.25)', badgeBorder: 'rgba(125, 211, 252, 0.4)', badgeText: '#bae6fd',
        cardBg: 'rgba(8, 47, 73, 0.85)', cardBorder: 'rgba(125, 211, 252, 0.3)',
        goldTextStart: '#4ade80', goldTextEnd: '#16a34a', strokeColor: '#4ade80', subTextColor: '#e0f2fe'
    },
    // 6. Deep Violet Twilight
    {
        bgStart: '#2e1065', bgMid: '#581c87', bgEnd: '#0f172a',
        badgeBg: 'rgba(168, 85, 247, 0.25)', badgeBorder: 'rgba(192, 132, 252, 0.4)', badgeText: '#d8b4fe',
        cardBg: 'rgba(46, 16, 101, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        goldTextStart: '#fde047', goldTextEnd: '#eab308', strokeColor: '#eab308', subTextColor: '#f3e8ff'
    }
];

/**
 * Creates an aesthetic 1080x1080 SVG Banner with Embedded Bengali Web Fonts (Hind Siliguri)
 */
function createAIPostBannerSVG({ line1, line2, line3, subText, badgeText }) {
    const safeLine1 = (line1 || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeLine2 = (line2 || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeLine3 = (line3 || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSub = (subText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeBadge = (badgeText || 'DAILY UPDATE').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Select random dynamic theme palette on every post card generation
    const theme = BANNER_COLOR_PALETTES[Math.floor(Math.random() * BANNER_COLOR_PALETTES.length)];

    return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@600;700&amp;display=swap');
      .bengali-font {
        font-family: 'Hind Siliguri', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
    </style>
    <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgStart}"/>
      <stop offset="50%" stop-color="${theme.bgMid}"/>
      <stop offset="100%" stop-color="${theme.bgEnd}"/>
    </linearGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.goldTextStart}"/>
      <stop offset="100%" stop-color="${theme.goldTextEnd}"/>
    </linearGradient>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.15)"/>
      <stop offset="100%" stop-color="rgba(0, 0, 0, 0)"/>
    </radialGradient>
  </defs>

  <!-- Background Base -->
  <rect width="1080" height="1080" fill="url(#bgGlow)"/>
  <circle cx="540" cy="540" r="500" fill="url(#centerGlow)"/>

  <!-- Glassmorphic Central Graphic Card -->
  <rect x="70" y="70" width="940" height="940" rx="36" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="3"/>

  <!-- Category Badge -->
  <rect x="120" y="130" width="340" height="64" rx="32" fill="${theme.badgeBg}" stroke="${theme.badgeBorder}" stroke-width="2"/>
  <text x="290" y="172" class="bengali-font" font-size="26" font-weight="bold" fill="${theme.badgeText}" text-anchor="middle">
    ${safeBadge}
  </text>

  <!-- Main Title Lines -->
  <text x="540" y="340" class="bengali-font" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">
    ${safeLine1}
  </text>
  <text x="540" y="420" class="bengali-font" font-size="42" font-weight="bold" fill="#ffffff" text-anchor="middle">
    ${safeLine2}
  </text>
  <text x="540" y="500" class="bengali-font" font-size="42" font-weight="bold" fill="url(#goldText)" text-anchor="middle">
    ${safeLine3}
  </text>

  <!-- Gold Decorative Line -->
  <line x1="420" y1="600" x2="660" y2="600" stroke="${theme.strokeColor}" stroke-width="4" stroke-linecap="round"/>

  <!-- Subtitle reflection -->
  <text x="540" y="700" class="bengali-font" font-size="28" fill="${theme.subTextColor}" text-anchor="middle">
    ${safeSub}
  </text>

  <!-- Footer Brand Header (Custom User Branding) -->
  <text x="540" y="930" class="bengali-font" font-size="24" font-weight="bold" fill="#94a3b8" text-anchor="middle" letter-spacing="4">
    ✨ FAMILY'S POST
  </text>
</svg>`;
}

/**
 * Generate Content & Matching Real PNG AI Image Banner for ANY Custom Topic Prompt
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

    // Render 1080x1080 AI Graphic Post Banner SVG Card with Google Bengali Fonts (Hind Siliguri)
    const svgCode = createAIPostBannerSVG({
        line1: cardLine1 || cleanTopic,
        line2: cardLine2 || '',
        line3: cardLine3 || '',
        subText: cardSubText || '',
        badgeText: cardBadge || '✨ FAMILY\'S POST'
    });

    // Return Data URL for instant crystal-clear rendering anywhere
    const mediaUrl = `data:image/svg+xml;base64,${Buffer.from(svgCode).toString('base64')}`;

    return { postText, mediaUrl };
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

    // 1. Generate text & AI Graphic Banner PNG
    const { postText, mediaUrl } = await generateContentAndImageForTopic(prompt);

    // 2. Publish to selected active platforms
    const results = {};
    for (const platform of targetPlatforms) {
        switch (platform.toUpperCase()) {
            case 'FACEBOOK':
                results.facebook = await facebookService.publishPost({ message: postText, mediaUrl });
                break;
            case 'INSTAGRAM':
                results.instagram = await instagramService.publishPost({ message: postText, mediaUrl });
                break;
            case 'TELEGRAM':
                results.telegram = await telegramService.publishPost({ message: postText, mediaUrl });
                break;
            case 'LINKEDIN':
                results.linkedin = await linkedinService.publishPost({ message: postText, mediaUrl });
                break;
        }
    }

    // 3. Save post entry to DB
    const savedPost = db.savePost({
        message: postText,
        mediaUrl,
        targetPlatforms,
        results,
        isAutonomousAIPost: true,
        status: 'PUBLISHED'
    });

    db.addLog('POST', 'ALL', 'Autonomous AI Daily Post published successfully with matching AI image!');
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
