const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const sharp = require('sharp');
const db = require('../database/db');

const GRAPH_BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * 2-Stage SaaS Token Resolver:
 * Resolves exact Page Access Token for any given Page ID from a User or Page Token
 */
async function getActivePageToken(token, pageId) {
    if (!token || !pageId) return token;
    try {
        // Stage 1: Try Direct Page Token query
        const directRes = await axios.get(`${GRAPH_BASE_URL}/${pageId}?fields=id,name,access_token&access_token=${token}`);
        if (directRes.data && directRes.data.access_token) {
            console.log(`[FB Token Resolver] Direct resolved Page Token for '${directRes.data.name}' (${pageId})`);
            db.saveSettings({ fbPageToken: directRes.data.access_token, fbPageId: pageId });
            return directRes.data.access_token;
        }
    } catch (e1) {
        try {
            // Stage 2: Try Accounts List query
            const res = await axios.get(`${GRAPH_BASE_URL}/me/accounts?access_token=${token}`);
            const pages = res.data?.data || [];
            const match = pages.find(p => p.id === pageId);
            if (match && match.access_token) {
                console.log(`[FB Token Resolver] Account list resolved Page Token for '${match.name}' (${match.id})`);
                db.saveSettings({ fbPageToken: match.access_token, fbPageId: match.id });
                return match.access_token;
            }
        } catch (e2) {}
    }
    return token;
}

/**
 * Facebook Graph API Integration
 */
const facebookService = {
    // Publish a post to Facebook Page
    publishPost: async ({ message, mediaUrl }) => {
        const { fbPageToken, fbPageId } = db.getSettings();
        if (!fbPageToken || !fbPageId) {
            db.addLog('POST', 'FACEBOOK', 'Facebook Page ID or Token missing in settings.', 'skipped');
            return { success: false, reason: 'FB Credentials Missing' };
        }

        // Auto-convert/resolve Page Token if needed
        const activeToken = await getActivePageToken(fbPageToken, fbPageId);

        try {
            let response;
            const isBase64 = mediaUrl && mediaUrl.startsWith('data:image/');
            const isLocalFile = mediaUrl && mediaUrl.startsWith('/uploads/');

            if (isBase64) {
                const parts = mediaUrl.split(',');
                const base64Data = parts[1];
                const isSvg = parts[0].includes('svg');
                let imageBuffer = Buffer.from(base64Data, 'base64');
                let contentType = isSvg ? 'image/svg+xml' : 'image/png';

                // Convert SVG Buffer to PNG Buffer for Meta Photo API compatibility
                if (isSvg) {
                    try {
                        imageBuffer = await sharp(imageBuffer).png({ quality: 95 }).toBuffer();
                        contentType = 'image/png';
                    } catch (sErr) {}
                }

                const form = new FormData();
                form.append('access_token', activeToken);
                form.append('source', imageBuffer, { filename: 'ai-banner.png', contentType });
                if (message) form.append('caption', message);

                response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/photos`, form, {
                    headers: form.getHeaders(),
                    timeout: 35000
                });
            } else if (isLocalFile) {
                const localFilePath = path.join(process.cwd(), 'public', mediaUrl);
                if (fs.existsSync(localFilePath)) {
                    // Send actual local PNG file stream directly to Facebook Page Graph API
                    const form = new FormData();
                    form.append('access_token', activeToken);
                    form.append('source', fs.createReadStream(localFilePath));
                    if (message) form.append('caption', message);

                    response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/photos`, form, {
                        headers: form.getHeaders(),
                        timeout: 35000
                    });
                } else {
                    response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/feed`, {
                        message,
                        access_token: activeToken
                    });
                }
            } else if (mediaUrl) {
                // External image URL
                response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/photos`, {
                    caption: message,
                    url: mediaUrl,
                    access_token: activeToken
                });
            } else {
                // Text only
                response = await axios.post(`${GRAPH_BASE_URL}/${fbPageId}/feed`, {
                    message,
                    access_token: activeToken
                });
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

    // Send Direct Message (Messenger DM)
    sendDirectMessage: async (recipientPsid, textMessage) => {
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
            });
            const msgId = response.data?.message_id || 'OK';
            db.addLog('DM_REPLY', 'FACEBOOK', `Messenger DM sent to recipient PSID: ${recipientPsid} (Msg ID: ${msgId})`);
        } catch (error) {
            const errDetail = error.response?.data?.error?.message || error.message;
            console.error('[FB DM Error]:', error.response?.data || error.message);
            db.addLog('DM_REPLY', 'FACEBOOK', `Messenger DM failed: ${errDetail}`, 'failed');
        }
    }
};

module.exports = facebookService;
