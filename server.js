const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
require('dotenv').config();

const postController = require('./src/controllers/post.controller');
const webhookController = require('./src/controllers/webhook.controller');
const rulesController = require('./src/controllers/rules.controller');
const { initAICronScheduler } = require('./src/services/aiCron.service');

const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Initialize Background AI Cron Scheduler (If supported)
try {
    initAICronScheduler();
} catch (e) {}

// Ensure uploads folder exists safely
const uploadsDir = isVercel ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'public/uploads');
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
} catch (e) {}

// Multer Storage Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.png';
        cb(null, 'upload-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage });

// Middleware with 50mb Body Size Limit for Base64 Graphic Banners
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    return res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// API Routes - Posts & Cross-Posting
app.post('/api/posts', postController.createPost);
app.get('/api/posts', postController.getPosts);
app.delete('/api/posts/:id', postController.deletePost);
app.delete('/api/posts', postController.clearPosts);
app.post('/api/posts/ai-trigger', postController.triggerAIPostNow);
app.post('/api/ai/preview', postController.generateAIPreview);

// API Routes - Rules & Settings
app.get('/api/rules', rulesController.getRules);
app.post('/api/rules', rulesController.saveRule);
app.delete('/api/rules/:id', rulesController.deleteRule);

app.get('/api/settings', rulesController.getSettings);
app.post('/api/settings', rulesController.saveSettings);

app.get('/api/logs', rulesController.getLogs);

// Webhook Routes (Meta - FB & IG with aliases)
app.get(['/api/webhook', '/api/webhook/meta'], webhookController.verifyMetaWebhook);
app.post(['/api/webhook', '/api/webhook/meta'], webhookController.handleMetaWebhook);

// Webhook Routes (Telegram)
app.post('/api/webhook/telegram', webhookController.handleTelegramWebhook);

// Webhook Routes (WhatsApp)
app.post('/api/webhook/whatsapp', webhookController.handleWhatsAppWebhook);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Fallback route to frontend UI
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server locally if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(` 🚀 Social Media Automation Hub Server Running!`);
        console.log(` 🌐 Dashboard UI: http://localhost:${PORT}`);
        console.log(`=======================================================`);
    });
}

module.exports = app;
