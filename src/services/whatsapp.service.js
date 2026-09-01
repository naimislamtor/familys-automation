const axios = require('axios');
const db = require('../database/db');

const GRAPH_BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * WhatsApp Business Cloud API Adapter (Modular Plug-and-Play)
 */
const whatsappService = {
    // Send WhatsApp Message via Meta Cloud API
    sendMessage: async (recipientPhoneNumber, textMessage) => {
        const { whatsappToken, whatsappPhoneId } = db.getSettings();
        if (!whatsappToken || !whatsappPhoneId) {
            db.addLog('DM_REPLY', 'WHATSAPP', 'WhatsApp Token or Phone Number ID not configured.', 'skipped');
            return { success: false, reason: 'WhatsApp Credentials Missing' };
        }

        try {
            const response = await axios.post(`${GRAPH_BASE_URL}/${whatsappPhoneId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientPhoneNumber,
                type: 'text',
                text: { body: textMessage }
            }, {
                headers: {
                    'Authorization': `Bearer ${whatsappToken}`,
                    'Content-Type': 'application/json'
                }
            });

            db.addLog('DM_REPLY', 'WHATSAPP', `WhatsApp message sent to ${recipientPhoneNumber}. ID: ${response.data.messages?.[0]?.id}`);
            return { success: true, messageId: response.data.messages?.[0]?.id };
        } catch (error) {
            const errDetail = error.response?.data?.error?.message || error.message;
            db.addLog('DM_REPLY', 'WHATSAPP', `WhatsApp Send Error: ${errDetail}`, 'failed');
            return { success: false, error: errDetail };
        }
    }
};

module.exports = whatsappService;
