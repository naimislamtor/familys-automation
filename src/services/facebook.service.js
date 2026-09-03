const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const FormData = require('form-data');
const { Readable } = require('stream');
const db = require('../database/db');

const GRAPH_BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Dynamically resolves Page Access Token from Page ID or User Token
 */
async function getActivePageToken(userOrPageToken, pageId) {
    if (!userOrPageToken) return null;
    
    // Test if provided token is already a direct Page Access Token
    try {
        const testRes = await axios.get(`${GRAPH_BASE_URL}/${pageId || 'me'}?fields=access_token&access_token=${userOrPageToken}`);
        if (testRes.data?.access_token) {
            return testRes.data.access_token;
        }
    } catch (e) {}

    // Fallback: Query /me/accounts to find matching Page Access Token
    try {
        const accountsRes = await axios.get(`${GRAPH_BASE_URL}/me/accounts?access_token=${userOrPageToken}`);
        const pages = accountsRes.data?.data || [];
        if (pages.length > 0) {
            const matchedPage = pageId ? pages.find(p => p.id === pageId) : pages[0];
            const pageAccessToken = matchedPage ? matchedPage.access_token : pages[0].access_token;
            if (pageAccessToken) {
                console.log(`[FB Token Resolver] Auto-extracted Page Access Token for Page '${matchedPage?.name || 'Page'}'`);
                return pageAccessToken;
            }
        }
    } catch (e) {}

    return userOrPageToken;
}

const facebookService = {
    /**
     * Fetches User Profile Details (first_name, last_name, gender) from Meta Graph API
     */
    async getUserProfile(senderPsid) {
        if (!senderPsid) return null;
        const settings = db.getSettings();
        const token = settings.fbPageToken;
        if (!token) return null;

        try {
            const url = `${GRAPH_BASE_URL}/${senderPsid}?fields=first_name,last_name,gender&access_token=${token}`;
            const res = await axios.get(url, { timeout: 4000 });
            if (res.data && res.data.first_name) {
                return {
                    first_name: res.data.first_name,
                    last_name: res.data.last_name || '',
                    gender: res.data.gender || 'male'
                };
            }
        } catch (e) {
            console.log('[Facebook Service Notice] getUserProfile error:', e.response?.data?.error?.message || e.message);
        }
        return null;
    },
    // Publish Photo/Text Post to Facebook Page
    publishPost: async ({ message, mediaUrl }) => {
        const { fbPageToken, fbPageId } = db.getSettings();
        const activeToken = await getActivePageToken(fbPageToken, fbPageId);

        if (!activeToken || !fbPageId) {
            db.addLog('POST', 'FACEBOOK', 'Facebook Page ID or Token missing in settings.', 'skipped');
            return { success: false, error: 'Facebook credentials not configured' };
        }

        try {
            let response;
            if (mediaUrl) {
                const isBase64 = mediaUrl.startsWith('data:image/');
                const isHttp = mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://');

                if (isBase64) {
                    const parts = mediaUrl.split(',');
                    const base64Data = parts[1];
                    const isSvg = parts[0].includes('svg');

                    let imageBuffer = Buffer.from(base64Data, 'base64');
                    if (isSvg) {
                        imageBuffer = await sharp(imageBuffer).png({ quality: 95 }).toBuffer();
                    }

                    const form = new FormData();
                    form.append('access_token', activeToken);
                    form.append('source', imageBuffer, { filename: 'ai-card-banner.png', contentType: 'image/png' });
                    if (message) form.append('caption', message);

                    response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/photos`, form, {
                        headers: form.getHeaders(),
                        timeout: 25000
                    });
                } else if (isHttp) {
                    response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/photos`, {
                        url: mediaUrl,
                        caption: message || '',
                        access_token: activeToken
                    }, { timeout: 25000 });
                } else {
                    const localFilePath = path.join(process.cwd(), 'public', mediaUrl);
                    if (fs.existsSync(localFilePath)) {
                        const form = new FormData();
                        form.append('access_token', activeToken);
                        form.append('source', fs.createReadStream(localFilePath));
                        if (message) form.append('caption', message);

                        response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/photos`, form, {
                            headers: form.getHeaders(),
                            timeout: 25000
                        });
                    } else {
                        response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/feed`, {
                            message,
                            access_token: activeToken
                        }, { timeout: 25000 });
                    }
                }
            } else {
                response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/feed`, {
                    message,
                    access_token: activeToken
                }, { timeout: 25000 });
            }

            const postId = response.data?.id || response.data?.post_id;
            db.addLog('POST', 'FACEBOOK', `Facebook post published successfully! ID: ${postId}`);
            return { success: true, postId };
        } catch (error) {
            const errDetail = error.response?.data?.error?.message || error.message;
            console.error('[FB Publish Error]:', error.response?.data || error.message);
            db.addLog('POST', 'FACEBOOK', `FB Publish Error: ${errDetail}`, 'failed');
            return { success: false, error: errDetail };
        }
    },

    // Auto-Like / React to a comment
    reactToComment: async (commentId, reactionType = 'LIKE') => {
        const { fbPageToken, fbPageId } = db.getSettings();
        const activeToken = await getActivePageToken(fbPageToken, fbPageId);
        if (!activeToken) return;

        try {
            await axios.post(`${GRAPH_BASE_URL}/${commentId}/likes`, {
                access_token: activeToken
            });
            db.addLog('COMMENT_REACTION', 'FACEBOOK', `Reacted ${reactionType} to comment ID: ${commentId}`);
        } catch (error) {
            console.error('[FB Comment Reaction Error]:', error.response?.data || error.message);
            db.addLog('COMMENT_REACTION', 'FACEBOOK', `Reaction failed for ${commentId}: ${error.message}`, 'failed');
        }
    },

    // Public Reply to a comment
    replyToComment: async (commentId, message) => {
        const { fbPageToken, fbPageId } = db.getSettings();
        const activeToken = await getActivePageToken(fbPageToken, fbPageId);
        if (!activeToken || !message) return;

        try {
            const response = await axios.post(`${GRAPH_BASE_URL}/${commentId}/comments`, {
                message,
                access_token: activeToken
            });
            db.addLog('COMMENT_REPLY', 'FACEBOOK', `Public reply sent to ${commentId}. Reply ID: ${response.data.id}`);
        } catch (error) {
            console.error('[FB Comment Reply Error]:', error.response?.data || error.message);
            db.addLog('COMMENT_REPLY', 'FACEBOOK', `Comment reply failed: ${error.message}`, 'failed');
        }
    },

    // Send Private Message (Inbox DM) to a commenter
    sendPrivateReplyToComment: async (commentId, message) => {
        const { fbPageToken, fbPageId } = db.getSettings();
        const activeToken = await getActivePageToken(fbPageToken, fbPageId);
        if (!activeToken || !message) return;

        try {
            const response = await axios.post(`${GRAPH_BASE_URL}/${commentId}/private_responses`, {
                message,
                access_token: activeToken
            });
            db.addLog('DM_REPLY', 'FACEBOOK', `Private reply sent to commenter ${commentId}. ID: ${response.data.id}`);
        } catch (error) {
            console.error('[FB Private Reply Error]:', error.response?.data || error.message);
            db.addLog('DM_REPLY', 'FACEBOOK', `Private reply failed: ${error.message}`, 'failed');
        }
    },

    // Send Direct Message (Messenger DM) with automatic Socket Retry
    sendDirectMessage: async (recipientPsid, textMessage, attempt = 1) => {
        const { fbPageToken, fbPageId } = db.getSettings();
        const activeToken = await getActivePageToken(fbPageToken, fbPageId);
        if (!activeToken) return;

        const targetEndpoint = (fbPageId && fbPageId.trim()) ? `${GRAPH_BASE_URL}/${fbPageId.trim()}/messages` : `${GRAPH_BASE_URL}/me/messages`;

        try {
            const response = await axios.post(targetEndpoint, {
                messaging_type: 'RESPONSE',
                recipient: { id: recipientPsid },
                message: { text: textMessage },
                access_token: activeToken
            }, { timeout: 10000 });

            const msgId = response.data?.message_id || 'OK';
            db.addLog('DM_REPLY', 'FACEBOOK', `Messenger DM sent to recipient PSID: ${recipientPsid} (Msg ID: ${msgId})`);
        } catch (error) {
            const errDetail = error.response?.data?.error?.message || error.message;

            // Auto-retry on socket hang up or temporary network glitches up to 3 attempts
            if (attempt < 3 && (errDetail.includes('socket') || errDetail.includes('ETIMEDOUT') || errDetail.includes('ECONNRESET') || errDetail.includes('hang up'))) {
                console.log(`[FB DM Notice] Socket glitch (${errDetail}). Auto-retrying attempt ${attempt + 1}...`);
                await new Promise(r => setTimeout(r, 500));
                return facebookService.sendDirectMessage(recipientPsid, textMessage, attempt + 1);
            }

            console.error('[FB DM Error]:', error.response?.data || error.message);
            db.addLog('DM_REPLY', 'FACEBOOK', `Messenger DM failed: ${errDetail}`, 'failed');
        }
    }
};

module.exports = facebookService;
