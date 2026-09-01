const axios = require('axios');
const db = require('../database/db');

const GRAPH_BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Instagram Graph API Integration
 */
const instagramService = {
    // Publish Photo to Instagram
    publishPost: async ({ message, mediaUrl }) => {
        const { fbPageToken, igAccountId } = db.getSettings();
        if (!fbPageToken || !igAccountId) {
            db.addLog('POST', 'INSTAGRAM', 'Instagram Account ID or Token missing in settings.', 'skipped');
            return { success: false, reason: 'IG Credentials Missing' };
        }

        if (!mediaUrl) {
            db.addLog('POST', 'INSTAGRAM', 'Instagram requires an image or video URL to publish a post.', 'skipped');
            return { success: false, reason: 'Media URL required for IG' };
        }

        try {
            // Step 1: Create Container
            const containerRes = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media`, {
                image_url: mediaUrl,
                caption: message,
                access_token: fbPageToken
            });

            const creationId = containerRes.data.id;

            // Step 2: Publish Container
            const publishRes = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media_publish`, {
                creation_id: creationId,
                access_token: fbPageToken
            });

            db.addLog('POST', 'INSTAGRAM', `IG Post published. ID: ${publishRes.data.id}`);
            return { success: true, postId: publishRes.data.id };
        } catch (error) {
            const errDetail = error.response?.data?.error?.message || error.message;
            db.addLog('POST', 'INSTAGRAM', `IG Publish Error: ${errDetail}`, 'failed');
            return { success: false, error: errDetail };
        }
    },

    // Reply to Instagram comment
    replyToComment: async (commentId, message) => {
        const { fbPageToken } = db.getSettings();
        if (!fbPageToken || !message) return;

        try {
            const response = await axios.post(`${GRAPH_BASE_URL}/${commentId}/replies`, {
                message,
                access_token: fbPageToken
            });
            db.addLog('COMMENT_REPLY', 'INSTAGRAM', `IG comment reply sent for ID ${commentId}. Reply ID: ${response.data.id}`);
        } catch (error) {
            console.error('[IG Comment Reply Error]:', error.response?.data || error.message);
            db.addLog('COMMENT_REPLY', 'INSTAGRAM', `IG comment reply failed: ${error.message}`, 'failed');
        }
    },

    // Send Instagram Direct Message or Private Reply to Commenter
    sendPrivateReplyToComment: async (commentId, message) => {
        const { fbPageToken } = db.getSettings();
        if (!fbPageToken || !message) return;

        try {
            const response = await axios.post(`${GRAPH_BASE_URL}/me/messages`, {
                recipient: { comment_id: commentId },
                message: { text: message },
                access_token: fbPageToken
            });
            db.addLog('DM_REPLY', 'INSTAGRAM', `IG Private reply sent to commenter ${commentId}. ID: ${response.data.message_id}`);
        } catch (error) {
            console.error('[IG Private Reply Error]:', error.response?.data || error.message);
            db.addLog('DM_REPLY', 'INSTAGRAM', `IG Private reply failed: ${error.message}`, 'failed');
        }
    }
};

module.exports = instagramService;
