const db = require('../database/db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const facebookService = require('./facebook.service');
const instagramService = require('./instagram.service');
const telegramService = require('./telegram.service');
const linkedinService = require('./linkedin.service');

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

// Curated Aesthetic Color Palettes for Random Theme Selection on Every Post Card
const BANNER_COLOR_PALETTES = [
    // 1. Cyber Midnight Indigo & Purple
    {
        bgStart: '#0f172a', bgMid: '#312e81', bgEnd: '#020617',
        badgeBg: 'rgba(99, 102, 241, 0.25)', badgeBorder: 'rgba(129, 140, 248, 0.4)', badgeText: '#a5b4fc',
        cardBg: 'rgba(15, 23, 42, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.18)',
        goldTextStart: '#fbbf24', goldTextEnd: '#f59e0b', strokeColor: '#f59e0b', subTextColor: '#cbd5e1'
    },
    // 2. Emerald Forest & Teal Gold
    {
        bgStart: '#064e3b', bgMid: '#022c22', bgEnd: '#065f46',
        badgeBg: 'rgba(16, 185, 129, 0.25)', badgeBorder: 'rgba(52, 211, 153, 0.4)', badgeText: '#6ee7b7',
        cardBg: 'rgba(4, 47, 38, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        goldTextStart: '#fde047', goldTextEnd: '#eab308', strokeColor: '#eab308', subTextColor: '#d1fae5'
    },
    // 3. Royal Velvet Rose & Sunset Gold
    {
        bgStart: '#4c0519', bgMid: '#881337', bgEnd: '#1e1b4b',
        badgeBg: 'rgba(244, 63, 94, 0.25)', badgeBorder: 'rgba(251, 113, 133, 0.4)', badgeText: '#fda4af',
        cardBg: 'rgba(76, 5, 25, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        goldTextStart: '#fef08a', goldTextEnd: '#f59e0b', strokeColor: '#f59e0b', subTextColor: '#fecdd3'
    },
    // 4. Oceanic Deep Cyan & Neon Gold
    {
        bgStart: '#083344', bgMid: '#164e63', bgEnd: '#0f172a',
        badgeBg: 'rgba(6, 182, 212, 0.25)', badgeBorder: 'rgba(34, 211, 238, 0.4)', badgeText: '#67e8f9',
        cardBg: 'rgba(8, 51, 68, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        goldTextStart: '#fef08a', goldTextEnd: '#eab308', strokeColor: '#eab308', subTextColor: '#cffafe'
    },
    // 5. Golden Amber & Dark Chocolate
    {
        bgStart: '#451a03', bgMid: '#78350f', bgEnd: '#1c1917',
        badgeBg: 'rgba(245, 158, 11, 0.25)', badgeBorder: 'rgba(251, 191, 36, 0.4)', badgeText: '#fde047',
        cardBg: 'rgba(69, 26, 3, 0.85)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        goldTextStart: '#ffffff', goldTextEnd: '#fef08a', strokeColor: '#fbbf24', subTextColor: '#fef3c7'
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
 * Creates an aesthetic 1080x1080 SVG Social Media Graphic Post Banner with Random Dynamic Colors
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
  <text x="290" y="172" font-family="'DejaVu Sans', sans-serif" font-size="24" font-weight="bold" fill="${theme.badgeText}" text-anchor="middle">
    ${safeBadge}
  </text>

  <!-- Main Title Lines -->
  <text x="540" y="340" font-family="'DejaVu Sans', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">
    ${safeLine1}
  </text>
  <text x="540" y="420" font-family="'DejaVu Sans', sans-serif" font-size="42" font-weight="bold" fill="#ffffff" text-anchor="middle">
    ${safeLine2}
  </text>
  <text x="540" y="500" font-family="'DejaVu Sans', sans-serif" font-size="42" font-weight="bold" fill="url(#goldText)" text-anchor="middle">
    ${safeLine3}
  </text>

  <!-- Gold Decorative Line -->
  <line x1="420" y1="600" x2="660" y2="600" stroke="${theme.strokeColor}" stroke-width="4" stroke-linecap="round"/>

  <!-- Subtitle reflection -->
  <text x="540" y="700" font-family="'DejaVu Sans', sans-serif" font-size="28" fill="${theme.subTextColor}" text-anchor="middle">
    ${safeSub}
  </text>

  <!-- Footer Brand Header (Custom User Branding) -->
  <text x="540" y="930" font-family="'DejaVu Sans', sans-serif" font-size="24" font-weight="bold" fill="#94a3b8" text-anchor="middle" letter-spacing="4">
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

    // Render 1080x1080 AI Graphic Post Banner SVG Card with Random Palette & "FAMILY'S POST" Footer
    const svgCode = createAIPostBannerSVG({
        line1: cardLine1 || cleanTopic,
        line2: cardLine2 || '',
        line3: cardLine3 || '',
        subText: cardSubText || '',
        badgeText: cardBadge || '✨ FAMILY\'S POST'
    });

    // Convert SVG to a REAL 1080x1080 PNG Image File using Sharp
    const filename = `ai-card-${Date.now()}.png`;
    const uploadsDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);

    try {
        await sharp(Buffer.from(svgCode))
            .png({ quality: 95 })
            .toFile(filePath);
        console.log(`[AI Card Generator] Successfully created 1080x1080 PNG file with random palette & FAMILY'S POST footer: /uploads/${filename}`);
    } catch (sharpErr) {
        console.error('[Sharp PNG Conversion Error]:', sharpErr.message);
    }

    const mediaUrl = `/uploads/${filename}`;
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

    // 2. Publish to target platforms
    const results = {};
    const promises = targetPlatforms.map(async (platform) => {
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
    });

    await Promise.all(promises);

    // 3. Save to database post history
    const savedPost = db.savePost({
        message: postText,
        mediaUrl,
        targetPlatforms,
        results,
        isAutonomousAIPost: true
    });

    // 4. Update last run date if automated run
    if (!customPromptOverride) {
        const today = new Date().toISOString().split('T')[0];
        db.saveSettings({ aiCronLastRunDate: today });
    }

    db.addLog('POST', 'ALL', `AI Post generated & published for topic: "${prompt.substring(0, 40)}"`);
    return { success: true, post: savedPost };
}

/**
 * Background Cron Loop running every 60 seconds
 */
function initAICronScheduler() {
    console.log('[AI Cron Scheduler] Initialized background check runner (60s tick)...');

    setInterval(async () => {
        try {
            const settings = db.getSettings();
            if (!settings.aiCronEnabled) return;

            const now = new Date();
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMinutes = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHours}:${currentMinutes}`;
            const todayStr = now.toISOString().split('T')[0];

            const scheduledTime = settings.aiCronTime || '10:00';
            const lastRun = settings.aiCronLastRunDate || '';

            if (currentTimeStr === scheduledTime && lastRun !== todayStr) {
                console.log(`[AI Cron Scheduler] Time match found (${currentTimeStr}). Running daily AI post!`);
                await executeDailyAIPost();
            }
        } catch (err) {
            console.error('[AI Cron Scheduler Error]:', err.message);
        }
    }, 60000);
}

module.exports = { initAICronScheduler, executeDailyAIPost, generateContentAndImageForTopic };
