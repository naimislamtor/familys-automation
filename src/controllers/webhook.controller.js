const db = require('../database/db');
const { processIncomingEvent } = require('../services/ruleProcessor.service');

/**
 * Webhook Handlers for Meta (Facebook & Instagram), Telegram, and WhatsApp
 */
const webhookController = {
    // 1. Meta (FB & IG) Verification Endpoint
    verifyMetaWebhook: (req, res) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        console.log('[Meta Webhook Verification Attempt]:', { mode, token, challenge });

        if (mode && token) {
            if (mode === 'subscribe') {
                console.log('[Meta Webhook Verified Successfully]');
                db.addLog('WEBHOOK', 'FACEBOOK', `Meta Webhook verified successfully with token: ${token}`);
                return res.status(200).send(challenge);
            }
        }
        return res.sendStatus(400);
    },

    // 2. Meta (FB & IG) Webhook Event Handler
    handleMetaWebhook: (req, res) => {
        const body = req.body;
        console.log('[Meta Webhook Received Event]:', JSON.stringify(body));

        // Always acknowledge Meta Webhook immediately with HTTP 200 OK
        res.status(200).send('EVENT_RECEIVED');

        if (!body) return;

        db.addLog('WEBHOOK', 'FACEBOOK', `Webhook event payload received: ${JSON.stringify(body).substring(0, 150)}`);

        if (body.object === 'page' || body.object === 'instagram') {
            const isInstagram = body.object === 'instagram';
            const platform = isInstagram ? 'INSTAGRAM' : 'FACEBOOK';

            body.entry?.forEach(entry => {
                // Handle Messaging (DMs, Quick Replies & Postbacks)
                entry.messaging?.forEach(messagingEvent => {
                    // Ignore self-echoes sent by the Page itself
                    if (messagingEvent.message?.is_echo) return;

                    const senderId = messagingEvent.sender?.id;
                    const settings = db.getSettings();
                    if (senderId && settings.fbPageId && senderId === settings.fbPageId) return;

                    const messageText = messagingEvent.message?.text 
                        || messagingEvent.message?.quick_reply?.payload 
                        || messagingEvent.postback?.title 
                        || messagingEvent.postback?.payload 
                        || 'hello';

                    if (senderId && messageText) {
                        processIncomingEvent({
                            platform,
                            eventType: 'DIRECT_MESSAGE',
                            text: messageText,
                            senderId
                        });
                    }
                });

                // Handle Changes (Feed Comments)
                entry.changes?.forEach(change => {
                    if (change.field === 'feed' || change.field === 'comments') {
                        const value = change.value;
                        if (value.item === 'comment' && value.verb === 'add') {
                            const commentId = value.comment_id || value.id;
                            const commentText = value.message;
                            const senderId = value.from?.id;

                            if (commentId && commentText) {
                                processIncomingEvent({
                                    platform,
                                    eventType: 'COMMENT',
                                    text: commentText,
                                    senderId,
                                    commentId
                                });
                            }
                        }
                    }
                });
            });

            return res.status(200).send('EVENT_RECEIVED');
        }

        return res.sendStatus(404);
    },

    // 3. Telegram Webhook Handler
    handleTelegramWebhook: async (req, res) => {
        const update = req.body;
        db.addLog('WEBHOOK', 'TELEGRAM', `Telegram Update received: ${JSON.stringify(update).substring(0, 150)}...`);

        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;

            processIncomingEvent({
                platform: 'TELEGRAM',
                eventType: 'DIRECT_MESSAGE',
                text,
                senderId: chatId
            });
        }

        return res.status(200).json({ ok: true });
    },

    // 4. WhatsApp Webhook Handler
    handleWhatsAppWebhook: async (req, res) => {
        const body = req.body;
        db.addLog('WEBHOOK', 'WHATSAPP', `WhatsApp Payload received: ${JSON.stringify(body).substring(0, 150)}...`);

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message && message.text?.body) {
            const senderPhone = message.from;
            const text = message.text.body;

            processIncomingEvent({
                platform: 'WHATSAPP',
                eventType: 'DIRECT_MESSAGE',
                text,
                senderId: senderPhone
            });
        }

        return res.status(200).send('EVENT_RECEIVED');
    }
};

module.exports = webhookController;
