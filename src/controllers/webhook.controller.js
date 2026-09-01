const db = require('../database/db');
const { processIncomingEvent } = require('../services/ruleProcessor.service');

// Asynchronous background processor for Meta Webhooks
async function processMetaEventAsync(body) {
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
            await processIncomingEvent({
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

    if (!body.entry || !Array.isArray(body.entry)) return;

    for (const entry of body.entry) {
        // Handle Messaging (DMs, Quick Replies & Postbacks)
        const messagingList = entry.messaging || entry.standby;
        if (messagingList && Array.isArray(messagingList)) {
            for (const messagingEvent of messagingList) {
                // Ignore self-echoes sent by the Page itself
                if (messagingEvent.message?.is_echo) continue;

                const senderId = messagingEvent.sender?.id;
                const messageText = messagingEvent.message?.text 
                    || messagingEvent.message?.quick_reply?.payload 
                    || messagingEvent.postback?.title 
                    || messagingEvent.postback?.payload 
                    || 'hello';

                if (senderId && messageText) {
                    await processIncomingEvent({
                        platform,
                        eventType: 'DIRECT_MESSAGE',
                        text: messageText,
                        senderId
                    });
                }
            }
        }

        // Handle Changes (Feed Comments)
        if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
                const value = change.value;
                if (!value) continue;

                if (change.field === 'feed' || change.field === 'comments') {
                    if (value.item === 'comment' && (value.verb === 'add' || !value.verb)) {
                        const commentId = value.comment_id || value.id;
                        const commentText = value.message;
                        const senderId = value.from?.id;

                        if (commentId && commentText) {
                            await processIncomingEvent({
                                platform,
                                eventType: 'COMMENT',
                                text: commentText,
                                senderId,
                                commentId
                            });
                        }
                    }
                }
            }
        }
    }
}

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

    // 2. Meta (FB & IG) Webhook Event Handler (Instant HTTP 200 OK + Decoupled Async Processing)
    handleMetaWebhook: (req, res) => {
        const body = req.body;

        // Step 1: Immediately acknowledge Meta in 0.001s to prevent Meta timeouts & retries
        res.status(200).send('EVENT_RECEIVED');

        // Step 2: Process event asynchronously in background
        setImmediate(async () => {
            try {
                await processMetaEventAsync(body);
            } catch (err) {
                console.error('[Meta Webhook Async Error]:', err.message);
            }
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
