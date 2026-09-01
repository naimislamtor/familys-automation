const db = require('../database/db');
const { generateAIReply } = require('./ai.service');
const facebookService = require('./facebook.service');
const instagramService = require('./instagram.service');
const telegramService = require('./telegram.service');
const whatsappService = require('./whatsapp.service');

/**
 * Evaluates incoming user messages or comments against active rules and executes actions
 */
async function processIncomingEvent({ platform, eventType, text, senderId, commentId }) {
    console.log(`[RuleProcessor] Processing ${eventType} on ${platform}: "${text}" from ${senderId || commentId}`);
    
    const rules = db.getRules().filter(r => r.active);
    const messageText = (text || '').toLowerCase().trim();

    let matchedRule = null;

    // 1. Try keyword matching
    for (const rule of rules) {
        if (rule.matchType === 'contains' && rule.keyword && messageText.includes(rule.keyword.toLowerCase())) {
            matchedRule = rule;
            break;
        } else if (rule.matchType === 'exact' && rule.keyword && messageText === rule.keyword.toLowerCase()) {
            matchedRule = rule;
            break;
        }
    }

    // 2. Fallback rule if no keyword matched
    if (!matchedRule) {
        matchedRule = rules.find(r => r.matchType === 'fallback');
    }

    if (!matchedRule) {
        console.log('[RuleProcessor] No rule matched and no fallback defined.');
        return;
    }

    console.log(`[RuleProcessor] Matched Rule: ${matchedRule.id} (Keyword: ${matchedRule.keyword})`);

    const { reaction, publicReply, privateDM, aiEnabled } = matchedRule.actions;

    // Determine final message text (Static vs AI)
    let finalPublicReply = publicReply;
    let finalPrivateDM = privateDM;

    if (aiEnabled) {
        const aiResponse = await generateAIReply(text);
        if (!finalPublicReply) finalPublicReply = aiResponse;
        if (!finalPrivateDM) finalPrivateDM = aiResponse;
    }

    // Execute Actions based on Event Type & Platform
    try {
        if (eventType === 'COMMENT') {
            // Action 1: Reaction / Like
            if (reaction && platform === 'FACEBOOK') {
                await facebookService.reactToComment(commentId, reaction);
            }

            // Action 2: Public Comment Reply
            if (finalPublicReply) {
                if (platform === 'FACEBOOK') {
                    await facebookService.replyToComment(commentId, finalPublicReply);
                } else if (platform === 'INSTAGRAM') {
                    await instagramService.replyToComment(commentId, finalPublicReply);
                }
            }

            // Action 3: Private Reply to Commenter (Inbox DM)
            if (finalPrivateDM) {
                if (platform === 'FACEBOOK') {
                    await facebookService.sendPrivateReplyToComment(commentId, finalPrivateDM);
                } else if (platform === 'INSTAGRAM') {
                    await instagramService.sendPrivateReplyToComment(commentId, finalPrivateDM);
                }
            }
        } else if (eventType === 'DIRECT_MESSAGE') {
            const replyMessage = finalPrivateDM || finalPublicReply;
            if (replyMessage) {
                if (platform === 'FACEBOOK') {
                    await facebookService.sendDirectMessage(senderId, replyMessage);
                } else if (platform === 'TELEGRAM') {
                    await telegramService.sendMessage(senderId, replyMessage);
                } else if (platform === 'WHATSAPP') {
                    await whatsappService.sendMessage(senderId, replyMessage);
                }
            }
        }
    } catch (err) {
        console.error('[RuleProcessor Execution Error]:', err.message);
    }
}

module.exports = { processIncomingEvent };
