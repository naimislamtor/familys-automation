document.addEventListener('DOMContentLoaded', () => {
    // Navigation Tabs
    const navItems = document.querySelectorAll('.nav-item');
    const tabPages = document.querySelectorAll('.tab-page');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const tabHeadings = {
        'tab-composer': { title: 'Cross-Platform Post Composer', subtitle: 'Publish content across Facebook, Instagram, Telegram & LinkedIn instantly.' },
        'tab-rules': { title: 'Auto-Reply & Reaction Rules', subtitle: 'Manage automatic likes, public replies, private inbox messages, and Gemini AI triggers.' },
        'tab-products': { title: 'Product Catalog & Knowledge Base', subtitle: 'Manage products, prices & details. Gemini AI dynamically uses this catalog for customer sales support.' },
        'tab-ai-creator': { title: 'Daily AI Autonomous Content Creator', subtitle: 'Set prompts and execution times for automatic daily AI post generation and publishing.' },
        'tab-history': { title: 'Post History Log', subtitle: 'View previous cross-platform publications and their delivery statuses.' },
        'tab-settings': { title: 'API Credentials & Settings', subtitle: 'Configure Meta, Telegram, LinkedIn, WhatsApp Cloud API, and Gemini AI tokens.' },
        'tab-logs': { title: 'System Activity Logs', subtitle: 'Monitor real-time webhook events, reactions, and auto-reply executions.' }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');

            navItems.forEach(n => n.classList.remove('active'));
            tabPages.forEach(p => p.classList.remove('active'));

            item.classList.add('active');
            const targetPage = document.getElementById(targetTab);
            if (targetPage) targetPage.classList.add('active');

            if (tabHeadings[targetTab]) {
                pageTitle.textContent = tabHeadings[targetTab].title;
                pageSubtitle.textContent = tabHeadings[targetTab].subtitle;
            }

            // Load data when tab opens
            if (targetTab === 'tab-rules') loadRules();
            if (targetTab === 'tab-products') loadProducts();
            if (targetTab === 'tab-ai-creator') loadSettings();
            if (targetTab === 'tab-history') loadHistory();
            if (targetTab === 'tab-settings') loadSettings();
            if (targetTab === 'tab-logs') loadLogs();
        });
    });

    // Platform Chip Selector Toggle Fix
    document.querySelectorAll('.platform-chip input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const chip = e.target.closest('.platform-chip');
            if (checkbox.checked) chip.classList.add('active');
            else chip.classList.remove('active');
        });
    });

    // Select All / Deselect All Buttons (Scoped to #tab-composer)
    const btnSelectAll = document.getElementById('btn-select-all');
    const btnDeselectAll = document.getElementById('btn-deselect-all');

    if (btnSelectAll && btnDeselectAll) {
        btnSelectAll.addEventListener('click', () => {
            document.querySelectorAll('#tab-composer .platform-chip').forEach(chip => {
                const cb = chip.querySelector('input[type="checkbox"]');
                cb.checked = true;
                chip.classList.add('active');
            });
        });

        btnDeselectAll.addEventListener('click', () => {
            document.querySelectorAll('#tab-composer .platform-chip').forEach(chip => {
                const cb = chip.querySelector('input[type="checkbox"]');
                cb.checked = false;
                chip.classList.remove('active');
            });
        });
    }

    // Media Preview Helper (Image vs Video)
    const previewImgTag = document.getElementById('preview-img-tag');
    const previewVideoTag = document.getElementById('preview-video-tag');
    const previewMediaBox = document.getElementById('preview-media-box');

    function updateMediaPreview(url) {
        if (!url) {
            previewMediaBox.style.display = 'none';
            if (previewImgTag) previewImgTag.style.display = 'none';
            if (previewVideoTag) previewVideoTag.style.display = 'none';
            return;
        }

        const isVideo = url.match(/\.(mp4|webm|ogg|mov)($|\?)/i);
        previewMediaBox.style.display = 'block';

        if (isVideo) {
            if (previewImgTag) previewImgTag.style.display = 'none';
            if (previewVideoTag) {
                previewVideoTag.src = url;
                previewVideoTag.style.display = 'block';
            }
        } else {
            if (previewVideoTag) previewVideoTag.style.display = 'none';
            if (previewImgTag) {
                previewImgTag.src = url;
                previewImgTag.style.display = 'block';
            }
        }
    }

    // Direct Image / Video File Upload Handler
    const postImageFile = document.getElementById('post-image-file');
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const uploadFileName = document.getElementById('upload-file-name');

    if (btnTriggerUpload && postImageFile) {
        btnTriggerUpload.addEventListener('click', () => postImageFile.click());

        postImageFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadFileName.textContent = file.name;
            btnTriggerUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

            const formData = new FormData();
            formData.append('image', file);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('post-media-url').value = data.url;
                    updateMediaPreview(data.url);
                    showToast('Media file uploaded successfully!');
                } else {
                    showToast(`Upload failed: ${data.error}`, 'error');
                }
            } catch (err) {
                showToast('Failed to upload media file.', 'error');
            } finally {
                btnTriggerUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload Image or Video File';
            }
        });
    }

    // Live Post Preview
    const postText = document.getElementById('post-text');
    const postMediaUrl = document.getElementById('post-media-url');
    const previewTextDisplay = document.getElementById('preview-text-display');

    postText.addEventListener('input', () => {
        previewTextDisplay.textContent = postText.value.trim() || 'Your caption text will preview live here as you type...';
    });

    postMediaUrl.addEventListener('input', () => {
        updateMediaPreview(postMediaUrl.value.trim());
    });

    // Direct HTML5 Canvas 2D Graphic Banner Generator with native Bengali Font rendering
    function drawAIPostBannerCanvas(cardData) {
        if (!cardData) return '';
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';

            const palettes = [
                { bgStart: '#0f172a', bgMid: '#1e1b4b', bgEnd: '#31104b', cardBg: 'rgba(15, 23, 42, 0.9)', badgeBg: 'rgba(99, 102, 241, 0.3)', badgeText: '#a5b4fc', gold1: '#fbbf24', gold2: '#f59e0b', sub: '#cbd5e1' },
                { bgStart: '#18002e', bgMid: '#3b0764', bgEnd: '#1e1b4b', cardBg: 'rgba(24, 0, 46, 0.9)', badgeBg: 'rgba(217, 70, 239, 0.3)', badgeText: '#f5d0fe', gold1: '#38bdf8', gold2: '#0284c7', sub: '#e9d5ff' },
                { bgStart: '#022c22', bgMid: '#064e3b', bgEnd: '#0f172a', cardBg: 'rgba(2, 44, 34, 0.9)', badgeBg: 'rgba(16, 185, 129, 0.3)', badgeText: '#a7f3d0', gold1: '#fde047', gold2: '#d97706', sub: '#ecfdf5' },
                { bgStart: '#4c0519', bgMid: '#881337', bgEnd: '#2e1065', cardBg: 'rgba(76, 5, 25, 0.9)', badgeBg: 'rgba(244, 63, 94, 0.3)', badgeText: '#fecdd3', gold1: '#fef08a', gold2: '#f59e0b', sub: '#ffe4e6' }
            ];
            const theme = palettes[Math.floor(Math.random() * palettes.length)];

            // 1. Background Gradient
            const bgGlow = ctx.createLinearGradient(0, 0, 1080, 1080);
            bgGlow.addColorStop(0, theme.bgStart);
            bgGlow.addColorStop(0.5, theme.bgMid);
            bgGlow.addColorStop(1, theme.bgEnd);
            ctx.fillStyle = bgGlow;
            ctx.fillRect(0, 0, 1080, 1080);

            // 2. Glassmorphic Card Frame
            ctx.fillStyle = theme.cardBg;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 3;
            ctx.fillRect(70, 70, 940, 940);
            ctx.strokeRect(70, 70, 940, 940);

            // 3. Category Badge
            ctx.fillStyle = theme.badgeBg;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.fillRect(120, 130, 340, 64);
            ctx.strokeRect(120, 130, 340, 64);

            ctx.fillStyle = theme.badgeText;
            ctx.font = 'bold 26px "Hind Siliguri", "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cardData.badgeText || '✨ DAILY UPDATE', 290, 172);

            // 4. Bengali Title Lines
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 44px "Hind Siliguri", "Segoe UI", Arial, sans-serif';
            if (cardData.line1) ctx.fillText(cardData.line1, 540, 340);
            if (cardData.line2) ctx.fillText(cardData.line2, 540, 420);

            // Line 3 Highlight
            const goldGrad = ctx.createLinearGradient(300, 0, 780, 0);
            goldGrad.addColorStop(0, theme.gold1);
            goldGrad.addColorStop(1, theme.gold2);
            ctx.fillStyle = goldGrad;
            ctx.font = 'bold 44px "Hind Siliguri", "Segoe UI", Arial, sans-serif';
            if (cardData.line3) ctx.fillText(cardData.line3, 540, 500);

            // Decorative Line
            ctx.strokeStyle = theme.gold1;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(420, 600);
            ctx.lineTo(660, 600);
            ctx.stroke();

            // SubText
            ctx.fillStyle = theme.sub;
            ctx.font = '28px "Hind Siliguri", "Segoe UI", Arial, sans-serif';
            if (cardData.subText) ctx.fillText(cardData.subText, 540, 700);

            // Brand Footer
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 24px "Hind Siliguri", "Segoe UI", Arial, sans-serif';
            ctx.fillText('✨ FAMILY\'S POST', 540, 930);

            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error('Canvas Draw Error:', e);
            return '';
        }
    }

    // Generate AI Post & Media Preview (Preview First!)
    const btnGenerateAiPreview = document.getElementById('btn-generate-ai-preview');
    const aiGeneratorPrompt = document.getElementById('ai-generator-prompt');

    if (btnGenerateAiPreview) {
        btnGenerateAiPreview.addEventListener('click', async () => {
            const promptText = aiGeneratorPrompt.value.trim();

            btnGenerateAiPreview.disabled = true;
            btnGenerateAiPreview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Preview...';

            try {
                const res = await fetch('/api/ai/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptText })
                });

                const data = await res.json();
                if (data.success) {
                    postText.value = data.postText;
                    previewTextDisplay.textContent = data.postText;

                    if (data.mediaUrl) {
                        postMediaUrl.value = data.mediaUrl;
                        updateMediaPreview(data.mediaUrl);
                    }

                    showToast('AI Post & Media Preview generated! Review & click Publish when ready.');
                } else {
                    showToast(`Preview failed: ${data.error}`, 'error');
                }
            } catch (err) {
                showToast('Failed to connect to AI preview generator.', 'error');
            } finally {
                btnGenerateAiPreview.disabled = false;
                btnGenerateAiPreview.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> ✨ Generate Preview';
            }
        });
    }

    // Schedule Option Toggle
    const postTimingOption = document.getElementById('post-timing-option');
    const scheduleDatetimeGroup = document.getElementById('schedule-datetime-group');

    if (postTimingOption) {
        postTimingOption.addEventListener('change', () => {
            if (postTimingOption.value === 'SCHEDULED') {
                scheduleDatetimeGroup.style.display = 'block';
            } else {
                scheduleDatetimeGroup.style.display = 'none';
            }
        });
    }

    // Publish / Schedule Post
    const btnPublish = document.getElementById('btn-publish-now');
    btnPublish.addEventListener('click', async () => {
        const message = postText.value.trim();
        let mediaUrl = postMediaUrl.value.trim();
        const selectedPlatforms = Array.from(document.querySelectorAll('#tab-composer input[name="platform"]:checked')).map(cb => cb.value);

        const timing = postTimingOption ? postTimingOption.value : 'NOW';
        const scheduleTime = document.getElementById('post-schedule-datetime')?.value;

        // Auto-convert SVG Data URL into real 1080x1080 PNG Data URL in browser before submitting!
        if (mediaUrl && mediaUrl.startsWith('data:image/svg+xml')) {
            btnPublish.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rendering PNG Card...';
            mediaUrl = await convertSvgToPngDataUrl(mediaUrl);
        }

        if (!message) {
            showToast('Please enter a caption message before publishing.', 'error');
            return;
        }

        if (selectedPlatforms.length === 0) {
            showToast('Please select at least one social media platform.', 'error');
            return;
        }

        if (timing === 'SCHEDULED' && !scheduleTime) {
            showToast('Please pick a future schedule date & time.', 'error');
            return;
        }

        btnPublish.disabled = true;
        btnPublish.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    mediaUrl,
                    platforms: selectedPlatforms,
                    isScheduled: timing === 'SCHEDULED',
                    scheduledTime: scheduleTime
                })
            });

            const data = await response.json();
            if (data.success) {
                showToast(data.message || 'Post request submitted successfully!');
                postText.value = '';
                postMediaUrl.value = '';
                previewTextDisplay.textContent = 'Your caption text will preview live here as you type...';
                updateMediaPreview('');
            } else {
                showToast(`Publishing failed: ${data.error}`, 'error');
            }
        } catch (err) {
            showToast('Error connecting to backend server.', 'error');
        } finally {
            btnPublish.disabled = false;
            btnPublish.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish / Schedule Post';
        }
    });

    // --- RULES MANAGEMENT ---
    const rulesTableBody = document.getElementById('rules-table-body');
    const ruleModal = document.getElementById('rule-modal');
    const btnAddRuleModal = document.getElementById('btn-add-rule-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelRule = document.getElementById('btn-cancel-rule');
    const btnSaveRule = document.getElementById('btn-save-rule');

    btnAddRuleModal.addEventListener('click', () => {
        openRuleModal();
    });

    btnCloseModal.addEventListener('click', () => ruleModal.style.display = 'none');
    btnCancelRule.addEventListener('click', () => ruleModal.style.display = 'none');

    function openRuleModal(rule = null) {
        document.getElementById('modal-rule-id').value = rule ? rule.id : '';
        document.getElementById('modal-keyword').value = rule ? rule.keyword : '';
        document.getElementById('modal-match-type').value = rule ? rule.matchType : 'contains';
        document.getElementById('modal-reaction').value = rule ? rule.actions.reaction || 'LIKE' : 'LIKE';
        document.getElementById('modal-public-reply').value = rule ? rule.actions.publicReply || '' : '';
        document.getElementById('modal-private-dm').value = rule ? rule.actions.privateDM || '' : '';
        document.getElementById('modal-ai-enabled').checked = rule ? !!rule.actions.aiEnabled : false;

        ruleModal.style.display = 'flex';
    }

    btnSaveRule.addEventListener('click', async () => {
        const id = document.getElementById('modal-rule-id').value;
        const keyword = document.getElementById('modal-keyword').value.trim();
        const matchType = document.getElementById('modal-match-type').value;
        const reaction = document.getElementById('modal-reaction').value;
        const publicReply = document.getElementById('modal-public-reply').value.trim();
        const privateDM = document.getElementById('modal-private-dm').value.trim();
        const aiEnabled = document.getElementById('modal-ai-enabled').checked;

        if (!keyword) {
            showToast('Rule keyword is required.', 'error');
            return;
        }

        const payload = {
            id: id || undefined,
            keyword,
            matchType,
            actions: { reaction, publicReply, privateDM, aiEnabled },
            active: true
        };

        try {
            const res = await fetch('/api/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('Auto-reply rule saved!');
                ruleModal.style.display = 'none';
                loadRules();
            }
        } catch (err) {
            showToast('Failed to save rule.', 'error');
        }
    });

    async function loadRules() {
        try {
            const res = await fetch('/api/rules');
            const data = await res.json();
            if (data.success) {
                rulesTableBody.innerHTML = data.rules.map(rule => `
                    <tr>
                        <td><strong>${rule.keyword}</strong></td>
                        <td><span class="badge-status badge-skipped">${rule.matchType}</span></td>
                        <td>${rule.actions.reaction || 'None'}</td>
                        <td>${rule.actions.publicReply || '<em style="color:#666">None</em>'}</td>
                        <td>${rule.actions.privateDM || '<em style="color:#666">None</em>'}</td>
                        <td>${rule.actions.aiEnabled ? '<span class="badge-status badge-success"><i class="fa-solid fa-robot"></i> Enabled</span>' : 'Disabled'}</td>
                        <td><span class="badge-status badge-success">Active</span></td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick="editRule('${rule.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="deleteRule('${rule.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error('Load rules error:', err);
        }
    }

    window.editRule = async (id) => {
        const res = await fetch('/api/rules');
        const data = await res.json();
        const rule = data.rules.find(r => r.id === id);
        if (rule) openRuleModal(rule);
    };

    window.deleteRule = async (id) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        await fetch(`/api/rules/${id}`, { method: 'DELETE' });
        showToast('Rule deleted.');
        loadRules();
    };

    // --- POST HISTORY ---
    async function loadHistory() {
        const historyTableBody = document.getElementById('history-table-body');
        try {
            const res = await fetch('/api/posts');
            const data = await res.json();
            if (data.success) {
                if (data.posts.length === 0) {
                    historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No post history recorded yet.</td></tr>';
                    return;
                }

                historyTableBody.innerHTML = data.posts.map(post => {
                    let mediaHtml = '<em style="color:#666">None</em>';
                    if (post.mediaUrl) {
                        const fullUrl = post.mediaUrl.startsWith('/') ? window.location.origin + post.mediaUrl : post.mediaUrl;
                        const isVideo = post.mediaUrl.match(/\.(mp4|webm|mov)($|\?)/i);
                        if (isVideo) {
                            mediaHtml = `<a href="${fullUrl}" target="_blank" class="media-preview-link"><i class="fa-solid fa-circle-play"></i> Watch Video</a>`;
                        } else {
                            mediaHtml = `<a href="${fullUrl}" target="_blank" class="media-preview-link"><img src="${fullUrl}" class="history-thumb"> View Image</a>`;
                        }
                    }

                    const platformBadges = Object.keys(post.results || {}).length > 0
                        ? Object.keys(post.results).map(p => {
                            const res = post.results[p];
                            if (res.success) {
                                return `<span class="badge-status badge-success" style="background:#10b981; color:#fff; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;"><i class="fa-solid fa-check"></i> ${p.toUpperCase()}: OK</span>`;
                            } else if (res.reason && res.reason.includes('Missing')) {
                                return `<span class="badge-status badge-skipped" style="background:#64748b; color:#fff; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;"><i class="fa-solid fa-ban"></i> ${p.toUpperCase()}: Skipped (No Token)</span>`;
                            } else {
                                return `<span class="badge-status badge-failed" style="background:#ef4444; color:#fff; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;"><i class="fa-solid fa-xmark"></i> ${p.toUpperCase()}: ${res.error || 'Failed'}</span>`;
                            }
                        }).join(' ')
                        : (post.targetPlatforms || []).map(p => `<span class="badge-status badge-skipped" style="background:#64748b; color:#fff; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">${p}: Pending</span>`).join(' ');

                    return `
                        <tr>
                            <td>${new Date(post.createdAt).toLocaleString()}</td>
                            <td><strong>${(post.message || '').substring(0, 45)}...</strong></td>
                            <td>${mediaHtml}</td>
                            <td>${(post.targetPlatforms || []).join(', ')}</td>
                            <td>${platformBadges}</td>
                            <td>
                                <button class="btn btn-danger btn-sm" onclick="deleteHistoryPost('${post.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error('Load history error:', err);
        }
    }

    window.deleteHistoryPost = async (id) => {
        if (!confirm('Are you sure you want to delete this post history item?')) return;
        try {
            await fetch(`/api/posts/${id}`, { method: 'DELETE' });
            showToast('Post history item deleted.');
            loadHistory();
        } catch (err) {
            showToast('Failed to delete post item.', 'error');
        }
    };

    const btnClearAllHistory = document.getElementById('btn-clear-all-history');
    if (btnClearAllHistory) {
        btnClearAllHistory.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to CLEAR ALL post history records?')) return;
            try {
                await fetch('/api/posts', { method: 'DELETE' });
                showToast('All post history cleared.');
                loadHistory();
            } catch (err) {
                showToast('Failed to clear history.', 'error');
            }
        });
    }

    // --- SETTINGS & AI CRON MANAGEMENT ---
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.success) {
                const s = data.settings;
                document.getElementById('setting-fbPageToken').value = s.fbPageToken || '';
                document.getElementById('setting-fbPageId').value = s.fbPageId || '';
                document.getElementById('setting-igAccountId').value = s.igAccountId || '';
                document.getElementById('setting-telegramBotToken').value = s.telegramBotToken || '';
                document.getElementById('setting-telegramChatId').value = s.telegramChatId || '';
                document.getElementById('setting-linkedinAccessToken').value = s.linkedinAccessToken || '';
                document.getElementById('setting-linkedinAuthorId').value = s.linkedinAuthorId || '';
                document.getElementById('setting-whatsappToken').value = s.whatsappToken || '';
                document.getElementById('setting-whatsappPhoneId').value = s.whatsappPhoneId || '';
                document.getElementById('setting-geminiApiKey').value = s.geminiApiKey || '';
                document.getElementById('setting-systemPrompt').value = s.systemPrompt || '';
                document.getElementById('setting-webhookVerifyToken').value = s.webhookVerifyToken || 'antigravity_secret_token_123';

                // AI Cron Settings
                if (document.getElementById('ai-cron-enabled')) {
                    document.getElementById('ai-cron-enabled').checked = !!s.aiCronEnabled;
                    document.getElementById('ai-cron-time').value = s.aiCronTime || '10:00';
                    document.getElementById('ai-cron-prompt').value = s.aiCronPrompt || '';
                }
            }
        } catch (err) {
            console.error('Load settings error:', err);
        }
    }

    const btnSaveAiCron = document.getElementById('btn-save-ai-cron');
    if (btnSaveAiCron) {
        btnSaveAiCron.addEventListener('click', async () => {
            const aiCronEnabled = document.getElementById('ai-cron-enabled').checked;
            const aiCronTime = document.getElementById('ai-cron-time').value;
            const aiCronPrompt = document.getElementById('ai-cron-prompt').value.trim();
            const aiCronPlatforms = Array.from(document.querySelectorAll('input[name="ai-cron-platform"]:checked')).map(cb => cb.value);

            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ aiCronEnabled, aiCronTime, aiCronPrompt, aiCronPlatforms })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Autonomous AI Creator settings saved!');
                }
            } catch (err) {
                showToast('Failed to save AI settings.', 'error');
            }
        });
    }

    // Manual Instant AI Post Trigger
    const btnTriggerAiNow = document.getElementById('btn-trigger-ai-now');
    if (btnTriggerAiNow) {
        btnTriggerAiNow.addEventListener('click', async () => {
            const promptText = document.getElementById('ai-cron-prompt')?.value.trim();

            btnTriggerAiNow.disabled = true;
            btnTriggerAiNow.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating AI Post...';

            try {
                const res = await fetch('/api/posts/ai-trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptText })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('AI Post generated and cross-posted for your prompt!');
                } else {
                    showToast(`AI Post generation failed: ${data.error}`, 'error');
                }
            } catch (err) {
                showToast('Failed to connect to AI generator.', 'error');
            } finally {
                btnTriggerAiNow.disabled = false;
                btnTriggerAiNow.innerHTML = '<i class="fa-solid fa-bolt"></i> Test & Generate AI Post Right Now!';
            }
        });
    }

    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        const payload = {
            fbPageToken: document.getElementById('setting-fbPageToken').value.trim(),
            fbPageId: document.getElementById('setting-fbPageId').value.trim(),
            igAccountId: document.getElementById('setting-igAccountId').value.trim(),
            telegramBotToken: document.getElementById('setting-telegramBotToken').value.trim(),
            telegramChatId: document.getElementById('setting-telegramChatId').value.trim(),
            linkedinAccessToken: document.getElementById('setting-linkedinAccessToken').value.trim(),
            linkedinAuthorId: document.getElementById('setting-linkedinAuthorId').value.trim(),
            whatsappToken: document.getElementById('setting-whatsappToken').value.trim(),
            whatsappPhoneId: document.getElementById('setting-whatsappPhoneId').value.trim(),
            geminiApiKey: document.getElementById('setting-geminiApiKey').value.trim(),
            systemPrompt: document.getElementById('setting-systemPrompt').value.trim(),
            webhookVerifyToken: document.getElementById('setting-webhookVerifyToken').value.trim()
        };

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('API Credentials saved successfully!');
            }
        } catch (err) {
            showToast('Failed to save settings.', 'error');
        }
    });

    // --- SYSTEM LOGS ---
    async function loadLogs() {
        const logsTableBody = document.getElementById('logs-table-body');
        try {
            const res = await fetch('/api/logs');
            const data = await res.json();
            if (data.success) {
                logsTableBody.innerHTML = data.logs.map(log => `
                    <tr>
                        <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td><strong>${log.type}</strong></td>
                        <td>${log.platform}</td>
                        <td>${log.details}</td>
                        <td>
                            <span class="badge-status ${log.status === 'success' ? 'badge-success' : log.status === 'failed' ? 'badge-failed' : 'badge-skipped'}">
                                ${log.status}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error('Load logs error:', err);
        }
    }

    document.getElementById('btn-refresh-logs').addEventListener('click', () => {
        loadLogs();
        showToast('Logs refreshed.');
    });

    // Product Catalog JSON Management (Identical Architecture to Auto-Reply Rules)
    async function loadProducts() {
        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) return;
        try {
            const res = await fetch('/api/products');
            const products = await res.json();

            if (!products || !Array.isArray(products) || products.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:25px; color:var(--text-muted);">No products in catalog. Click "+ Add Product" to add your first item.</td></tr>`;
                return;
            }

            tableBody.innerHTML = products.map(p => `
                <tr>
                    <td><span class="badge-status badge-skipped"><i class="fa-solid fa-barcode"></i> ${p.code || 'N/A'}</span></td>
                    <td><strong>${p.title}</strong></td>
                    <td>${p.category || 'General'}</td>
                    <td><strong style="color:#10b981;">${p.price}</strong></td>
                    <td><span class="badge-status ${p.stock === 'In Stock' ? 'badge-success' : 'badge-failed'}">${p.stock || 'In Stock'}</span></td>
                    <td>
                        <div style="font-size:0.85rem; color:#cbd5e1;">${p.description || ''}</div>
                        ${p.fbLink ? `<a href="${p.fbLink}" target="_blank" style="color:#60a5fa; text-decoration:none; font-size:0.82rem;"><i class="fa-brands fa-facebook"></i> View Post/Reel</a>` : ''}
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Load products error:', err);
        }
    }

    window.editProduct = async (id) => {
        try {
            const res = await fetch('/api/products');
            const products = await res.json();
            const prod = products.find(p => p.id === id);
            if (prod) openProductModal(prod);
        } catch (err) {
            showToast('Failed to fetch product details.', 'error');
        }
    };

    window.deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product from the catalog?')) return;
        try {
            await fetch(`/api/products/${id}`, { method: 'DELETE' });
            showToast('Product deleted from catalog.');
            loadProducts();
        } catch (err) {
            showToast('Failed to delete product.', 'error');
        }
    };

    const productModal = document.getElementById('product-modal');
    function openProductModal(prod = null) {
        document.getElementById('modal-product-id').value = prod ? prod.id : '';
        document.getElementById('modal-product-code').value = prod ? (prod.code || '') : '';
        document.getElementById('modal-product-title').value = prod ? prod.title : '';
        document.getElementById('modal-product-category').value = prod ? prod.category : '';
        document.getElementById('modal-product-price').value = prod ? prod.price : '';
        document.getElementById('modal-product-fblink').value = prod ? (prod.fbLink || '') : '';
        document.getElementById('modal-product-stock').value = prod ? prod.stock : 'In Stock';
        document.getElementById('modal-product-description').value = prod ? prod.description : '';
        if (productModal) productModal.style.display = 'flex';
    }

    document.getElementById('btn-add-product')?.addEventListener('click', () => openProductModal());
    document.getElementById('btn-close-product-modal')?.addEventListener('click', () => { if (productModal) productModal.style.display = 'none'; });
    document.getElementById('btn-cancel-product')?.addEventListener('click', () => { if (productModal) productModal.style.display = 'none'; });

    document.getElementById('btn-save-product')?.addEventListener('click', async () => {
        const id = document.getElementById('modal-product-id').value;
        const code = document.getElementById('modal-product-code').value.trim();
        const title = document.getElementById('modal-product-title').value.trim();
        const category = document.getElementById('modal-product-category').value.trim();
        const price = document.getElementById('modal-product-price').value.trim();
        const fbLink = document.getElementById('modal-product-fblink').value.trim();
        const stock = document.getElementById('modal-product-stock').value;
        const description = document.getElementById('modal-product-description').value.trim();

        if (!title || !price) {
            showToast('Please enter Product Title and Price.', 'error');
            return;
        }

        const productData = { id, code, title, category, price, fbLink, stock, description };

        await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (productModal) productModal.style.display = 'none';
        showToast('Product item added/updated in catalog.');
        loadProducts();
    });

    // Toast Utility
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.borderColor = type === 'error' ? 'var(--danger)' : 'var(--primary)';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // Initial Load
    loadSettings();
    loadProducts();
});
