const axios = require('axios');
const db = require('../database/db');

/**
 * LinkedIn API Integration
 */
const linkedinService = {
    publishPost: async ({ message, mediaUrl }) => {
        const { linkedinAccessToken, linkedinAuthorId } = db.getSettings();
        if (!linkedinAccessToken || !linkedinAuthorId) {
            db.addLog('POST', 'LINKEDIN', 'LinkedIn Token or Author ID missing in settings.', 'skipped');
            return { success: false, reason: 'LinkedIn Credentials Missing' };
        }

        try {
            const authorUrn = linkedinAuthorId.startsWith('urn:li:') 
                ? linkedinAuthorId 
                : `urn:li:person:${linkedinAuthorId}`;

            const payload = {
                author: authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text: message },
                        shareMediaCategory: 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };

            const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', payload, {
                headers: {
                    'Authorization': `Bearer ${linkedinAccessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json'
                }
            });

            db.addLog('POST', 'LINKEDIN', `LinkedIn post published. ID: ${response.data.id}`);
            return { success: true, postId: response.data.id };
        } catch (error) {
            const errDetail = error.response?.data?.message || error.message;
            db.addLog('POST', 'LINKEDIN', `LinkedIn Publish Error: ${errDetail}`, 'failed');
            return { success: false, error: errDetail };
        }
    }
};

module.exports = linkedinService;
