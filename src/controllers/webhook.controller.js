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

    // 2. Meta (FB & IG) Webhook Event Handler (Supports both Live Events and Meta Console Test Buttons)
    handleMetaWebhook: (req, res) => {
        const body = req.body;
        console.log('[Meta Webhook Received Event]:', JSON.stringify(body));

        // Always acknowledge Meta Webhook immediately with HTTP 200 OK
        res.status(200).send('EVENT_RECEIVED');

        if (!body) return;

        db.addLog('WEBHOOK', 'FACEBOOK', `Webhook payload: ${JSON.stringify(body).substring(0, 160)}`);

        // 1. Handle Meta Console Test Button Payloads ({ sample: { field: "messages", value: ... } })
        if (body.sample) {
            const sampleField = body.sample.field;
            const value = body.sample.value;

            if (sampleField === 'messages' && value) {
                const senderId = value.sender?.id || '12345';
                const messageText = value.message?.text || 'test_message';
                db.addLog('WEBHOOK_TEST', 'FACEBOOK', `Meta Console Test Message received from ${senderId}: "${messageText}"`);
                processIncomingEvent({
                    platform: 'FACEBOOK',
                    eventType: 'DIRECT_MESSAGE',
                    text: messageText,
                    senderId
                });
            }
            return;
        }

        // 2. Handle Live Webhook Payloads (body.entry, body.object)
        const platform = (body.object === 'instagram') ? 'INSTAGRAM' : 'FACEBOOK';

        body.entry?.forEach(entry => {
            // Handle Messaging (DMs, Quick Replies & Postbacks)
            const messagingList = entry.messaging || entry.standby;
            messagingList?.forEach(messagingEvent => {
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
                const value = change.value;
                if (!value) return;

                if (change.field === 'feed' || change.field === 'comments') {
                    if (value.item === 'comment' && (value.verb === 'add' || !value.verb)) {
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
    },

    // 3. Telegram Webhook Event Handler
    handleTelegramWebhook: (req, res) => {
        const body = req.body;
        res.status(200).send('OK');

        if (body?.message?.text) {
            const senderId = String(body.message.chat.id);
            const text = body.message.text;

            db.addLog('WEBHOOK', 'TELEGRAM', `Telegram DM received from ${senderId}: "${text}"`);

            processIncomingEvent({
                platform: 'TELEGRAM',
                eventType: 'DIRECT_MESSAGE',
                text,
                senderId
            });
        }
    },

    // 4. WhatsApp Webhook Event Handler
    handleWhatsAppWebhook: (req, res) => {
        const body = req.body;
        res.status(200).send('OK');

        const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (message?.text?.body) {
            const senderId = message.from;
            const text = message.text.body;

            db.addLog('WEBHOOK', 'WHATSAPP', `WhatsApp DM received from ${senderId}: "${text}"`);

            processIncomingEvent({
                platform: 'WHATSAPP',
                eventType: 'DIRECT_MESSAGE',
                text,
                senderId
            });
        }
    }
};

module.exports = webhookController;
