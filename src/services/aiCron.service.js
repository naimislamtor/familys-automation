const axios = require('axios');
const fs = require('fs');
const path = require('path');
// Safe lazy loading for native binary module @napi-rs/canvas
let createCanvas = null;
let GlobalFonts = null;
let isCanvasAvailable = false;

try {
    const canvasPkg = require('@napi-rs/canvas');
    createCanvas = canvasPkg.createCanvas;
    GlobalFonts = canvasPkg.GlobalFonts;
    isCanvasAvailable = true;

    const fontPathBold = path.join(__dirname, '../fonts/HindSiliguri-Bold.ttf');
    const fontPathRegular = path.join(__dirname, '../fonts/HindSiliguri-Regular.ttf');

    if (GlobalFonts) {
        if (fs.existsSync(fontPathBold)) GlobalFonts.registerFromPath(fontPathBold, 'HindSiliguriBold');
        if (fs.existsSync(fontPathRegular)) GlobalFonts.registerFromPath(fontPathRegular, 'HindSiliguriRegular');
    }
} catch (e) {
    console.log('[AI Banner Notice] Native canvas module optional.');
}

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
        cardBg: 'rgba(15, 23, 42, 0.88)', cardBorder: 'rgba(255, 255, 255, 0.18)',
        gold1: '#fbbf24', gold2: '#f59e0b', sub: '#cbd5e1'
    },
    // 2. Neon Cyber Purple
    {
        bgStart: '#18002e', bgMid: '#3b0764', bgEnd: '#1e1b4b',
        badgeBg: 'rgba(217, 70, 239, 0.25)', badgeBorder: 'rgba(240, 171, 252, 0.4)', badgeText: '#f5d0fe',
        cardBg: 'rgba(24, 0, 46, 0.88)', cardBorder: 'rgba(240, 171, 252, 0.25)',
        gold1: '#38bdf8', gold2: '#0284c7', sub: '#e9d5ff'
    },
    // 3. Royal Emerald Gold
    {
        bgStart: '#022c22', bgMid: '#064e3b', bgEnd: '#0f172a',
        badgeBg: 'rgba(16, 185, 129, 0.25)', badgeBorder: 'rgba(110, 231, 183, 0.4)', badgeText: '#a7f3d0',
        cardBg: 'rgba(2, 44, 34, 0.88)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        gold1: '#fde047', gold2: '#d97706', sub: '#ecfdf5'
    },
    // 4. Sunset Coral Glow
    {
        bgStart: '#4c0519', bgMid: '#881337', bgEnd: '#2e1065',
        badgeBg: 'rgba(244, 63, 94, 0.25)', badgeBorder: 'rgba(251, 113, 133, 0.4)', badgeText: '#fecdd3',
        cardBg: 'rgba(76, 5, 25, 0.88)', cardBorder: 'rgba(255, 255, 255, 0.2)',
        gold1: '#fef08a', gold2: '#f59e0b', sub: '#ffe4e6'
    }
];

/**
 * Creates an aesthetic 1080x1080 Real PNG Graphic Card Banner with @napi-rs/canvas and TrueType Bengali Font
 */
function createAIPostBannerCanvasBuffer({ line1, line2, line3, subText, badgeText }) {
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');

    const theme = BANNER_COLOR_PALETTES[Math.floor(Math.random() * BANNER_COLOR_PALETTES.length)];

    // Replace color emoji symbols with clean geometric star ★ to prevent square boxes on canvas
    const safeBadgeText = (badgeText || 'DAILY UPDATE')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '★')
        .trim();

    // 1. Background Base Gradient
    const bgGlow = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGlow.addColorStop(0, theme.bgStart);
    bgGlow.addColorStop(0.5, theme.bgMid);
    bgGlow.addColorStop(1, theme.bgEnd);
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Glassmorphic Central Graphic Card Frame
    ctx.fillStyle = theme.cardBg;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.fillRect(70, 70, 940, 940);
    ctx.strokeRect(70, 70, 940, 940);

    // 3. Category Badge
    ctx.fillStyle = theme.badgeBg;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.fillRect(120, 130, 340, 64);
    ctx.strokeRect(120, 130, 340, 64);

    ctx.fillStyle = theme.badgeText;
    ctx.font = '26px HindSiliguriBold, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(safeBadgeText.startsWith('★') ? safeBadgeText : `★ ${safeBadgeText}`, 290, 172);

    // 4. Main Title Lines (Bengali Text rendered natively with HindSiliguri TTF)
    ctx.fillStyle = '#ffffff';
    ctx.font = '44px HindSiliguriBold, sans-serif';
    if (line1) ctx.fillText(line1, 540, 340);
    if (line2) ctx.fillText(line2, 540, 420);

    // Line 3 Gold Highlight
    ctx.fillStyle = theme.gold1;
    ctx.font = '44px HindSiliguriBold, sans-serif';
    if (line3) ctx.fillText(line3, 540, 500);

    // Gold Decorative Line
    ctx.strokeStyle = theme.gold1;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(420, 600);
    ctx.lineTo(660, 600);
    ctx.stroke();

    // Subtitle reflection
    ctx.fillStyle = theme.sub;
    ctx.font = '28px HindSiliguriRegular, sans-serif';
    if (subText) ctx.fillText(subText, 540, 700);

    // Footer Brand Header (Custom User Branding with ★ Star Symbol)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px HindSiliguriBold, sans-serif';
    ctx.fillText('★ FAMILY\'S POST', 540, 930);

    return canvas.toBuffer('image/png');
}

/**
 * Generate Content & Real PNG Frame Card Banner for ANY Custom Topic Prompt
 */
async function generateContentAndImageForTopic(userTopicPrompt) {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    let postText = '';
    let cardBadge = '★ DAILY UPDATE';
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
2. "cardBadge": A short 2-3 word category badge title (e.g. "কুরআনের বাণী", "টেকনোলজি নিউজ", "আজকের চিন্তা").
3. "cardLine1": First line of main headline/quote in Bengali (max 6 words).
4. "cardLine2": Second line of main headline/quote in Bengali (max 6 words).
5. "cardLine3": Highlights or punchline in Bengali (max 5 words).
6. "cardSubText": Short reflection or summary line in Bengali (max 8 words).

Example JSON output:
{
  "postText": "✨ **আজকের বার্তা**\\n\\nনতুন দিনে নতুন পথ চলা...",
  "cardBadge": "আজকের চিন্তা",
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
        badgeText: cardBadge || '★ FAMILY\'S POST'
    };

    // Generate Real 1080x1080 PNG Image Buffer using @napi-rs/canvas and TrueType Font
    const pngBuf = createAIPostBannerCanvasBuffer(cardData);
    const mediaUrl = `data:image/png;base64,${pngBuf.toString('base64')}`;

    console.log(`[AI PNG Banner Engine] Successfully generated 1080x1080 Native PNG Banner using @napi-rs/canvas!`);

    return { postText, cardData, mediaUrl };
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
    const { postText, cardData, mediaUrl } = await generateContentAndImageForTopic(prompt);

    // 2. Save post entry to DB
    const savedPost = db.savePost({
        message: postText,
        mediaUrl,
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
