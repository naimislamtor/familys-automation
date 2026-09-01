const db = require('../database/db');
const facebookService = require('../services/facebook.service');
const instagramService = require('../services/instagram.service');
const telegramService = require('../services/telegram.service');
const linkedinService = require('../services/linkedin.service');
const { executeDailyAIPost, generateContentAndImageForTopic } = require('../services/aiCron.service');

/**
 * Multi-Platform Cross-Posting Controller
 */
async function executePublishing({ message, mediaUrl, platforms }) {
    const results = {};
    const postPromises = platforms.map(async (platform) => {
        try {
            switch (platform.toUpperCase()) {
                case 'FACEBOOK':
                    results.facebook = await facebookService.publishPost({ message, mediaUrl });
                    break;
                case 'INSTAGRAM':
                    results.instagram = await instagramService.publishPost({ message, mediaUrl });
                    break;
                case 'TELEGRAM':
                    results.telegram = await telegramService.publishPost({ message, mediaUrl });
                    break;
                case 'LINKEDIN':
                    results.linkedin = await linkedinService.publishPost({ message, mediaUrl });
                    break;
                default:
                    results[platform] = { success: false, reason: 'Unsupported platform' };
            }
        } catch (e) {
            results[platform] = { success: false, error: e.message };
        }
    });

    await Promise.all(postPromises);
    return results;
}

async function createPost(req, res) {
    try {
        const { message, mediaUrl, platforms, isScheduled, scheduledTime } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Post message/caption is required.' });
        }

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({ success: false, error: 'Please select at least one social media platform.' });
        }

        // Handle Scheduled Post
        if (isScheduled && scheduledTime) {
            const scheduledDate = new Date(scheduledTime);
            if (scheduledDate > new Date()) {
                const savedPost = db.savePost({
                    message,
                    mediaUrl,
                    targetPlatforms: platforms,
                    isScheduled: true,
                    scheduledTime: scheduledDate.toISOString(),
                    status: 'SCHEDULED',
                    results: {}
                });
                db.addLog('POST', 'ALL', `Post scheduled for ${scheduledDate.toLocaleString()}`);
                return res.json({
                    success: true,
                    message: `Post successfully scheduled for ${scheduledDate.toLocaleString()}.`,
                    post: savedPost
                });
            }
        }

        // Execute Immediate Post
        const results = await executePublishing({ message, mediaUrl, platforms });

        const savedPost = db.savePost({
            message,
            mediaUrl,
            targetPlatforms: platforms,
            status: 'PUBLISHED',
            results
        });

        return res.json({
            success: true,
            message: 'Cross-posting request processed instantly.',
            post: savedPost
        });
    } catch (err) {
        console.error('[CreatePost Error]:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}

// Background scheduler checker for scheduled posts (runs every 30s)
setInterval(async () => {
    try {
        const posts = db.getPosts(100);
        const now = new Date();

        for (const post of posts) {
            if (post.isScheduled && post.status === 'SCHEDULED' && new Date(post.scheduledTime) <= now) {
                console.log(`[Scheduler] Executing scheduled post ID: ${post.id}`);
                post.status = 'PROCESSING';
                db.savePost(post);

                const results = await executePublishing({
                    message: post.message,
                    mediaUrl: post.mediaUrl,
                    platforms: post.targetPlatforms
                });

                post.status = 'PUBLISHED';
                post.results = results;
                db.savePost(post);
                db.addLog('POST', 'ALL', `Scheduled post ${post.id} published successfully.`);
            }
        }
    } catch (err) {
        console.error('[Scheduler Error]:', err.message);
    }
}, 30000);

function getPosts(req, res) {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const posts = db.getPosts(limit);
    return res.json({ success: true, posts });
}

// Trigger Instant AI Autonomous Post
async function triggerAIPostNow(req, res) {
    try {
        const customPrompt = req.body?.prompt || null;
        const result = await executeDailyAIPost(customPrompt);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

// Generate AI Text & Image Preview (WITHOUT publishing to social media)
async function generateAIPreview(req, res) {
    try {
        const prompt = req.body?.prompt || 'Inspirational daily quote for success';
        const result = await generateContentAndImageForTopic(prompt);
        return res.json({
            success: true,
            postText: result.postText,
            mediaUrl: result.mediaUrl
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

function deletePost(req, res) {
    const { id } = req.params;
    db.deletePost(id);
    return res.json({ success: true, message: 'Post record deleted.' });
}

function clearPosts(req, res) {
    db.clearPosts();
    return res.json({ success: true, message: 'All post history cleared.' });
}

module.exports = { createPost, getPosts, deletePost, clearPosts, triggerAIPostNow, generateAIPreview };
