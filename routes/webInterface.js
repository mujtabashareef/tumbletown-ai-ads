// routes/webInterface.js - Web Interface Route
const express = require('express');
const router = express.Router();

// Main Web Interface
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>TumbleTown AI Ad Generator</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: #6B46C1; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .badge { background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; display: inline-block; margin: 10px 0; }
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .tab { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; background: #e2e8f0; color: #475569; transition: all 0.2s; }
        .tab.active { background: #6B46C1; color: white; }
        .tab:hover:not(.active) { background: #cbd5e1; }
        .card { background: white; padding: 24px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; margin: 5px; font-weight: 500; transition: all 0.2s; }
        .btn-primary { background: #6B46C1; color: white; }
        .btn-primary:hover { background: #553C9A; }
        .btn-success { background: #10B981; color: white; }
        .btn-success:hover { background: #059669; }
        .generate-btn { background: #10B981; color: white; padding: 20px 40px; font-size: 18px; border-radius: 12px; margin: 20px auto; display: block; }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2rem; font-weight: bold; color: #6B46C1; }
        .hidden { display: none; }
        .idea-card { border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; }
        .idea-card.used { background: #f9fafb; opacity: 0.7; }
        .tag { background: #ddd6fe; color: #5b21b6; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-right: 8px; }
        .post-image { max-width: 100%; max-height: 300px; border-radius: 8px; margin: 10px 0; }
        .private-link { background: #faf5ff; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .status-badge { background: #ddd6fe; color: #5b21b6; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
        .upload-area { border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; margin: 10px 0; }
        .upload-area:hover { border-color: #6B46C1; background: #faf5ff; }
        .asset-item { display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #f9fafb; border-radius: 6px; margin: 8px 0; }
        .asset-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
        .message { padding: 12px; border-radius: 8px; margin: 10px 0; }
        .message.success { background: #f0fdf4; color: #166534; }
        .message.error { background: #fef2f2; color: #dc2626; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎪 TumbleTown AI Ad Generator</h1>
            <p>100% FREE automated marketing for your indoor playground</p>
            <div class="badge">Powered by Pollinations AI • $0.00 per ad</div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('dashboard')">📊 Dashboard</button>
            <button class="tab" onclick="showTab('ideas')">💡 Ideas</button>
            <button class="tab" onclick="showTab('prompts')">🎨 Prompt DNA</button>
            <button class="tab" onclick="showTab('assets')">📁 Assets</button>
            <button class="tab" onclick="showTab('posts')">📸 Posts</button>
        </div>

        <div id="message" style="margin: 10px 0;"></div>

        <div id="dashboard" class="card">
            <h2>🚀 Generate New Ad</h2>
            <p>Click below to generate a beautiful playground ad using AI</p>
            <button class="generate-btn" onclick="generateAd()" id="generateBtn">🎪 Generate Ad Now</button>
            <div id="generateStatus" style="margin-top: 15px;"></div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number" id="statsIdeas">-</div>
                    <div>Total Ideas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="statsUnused">-</div>
                    <div>Unused Ideas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="statsPosts">-</div>
                    <div>Generated Ads</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$0.00</div>
                    <div>Monthly Cost</div>
                </div>
            </div>
        </div>

        <div id="ideas" class="card hidden">
            <h2>💡 Add New Idea</h2>
            <div class="form-group">
                <label>Idea Title</label>
                <input type="text" id="ideaTitle" placeholder="e.g., Birthday Party Special">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="ideaDescription" placeholder="Describe your ad idea..."></textarea>
            </div>
            <div class="form-group">
                <label>Tags (comma separated)</label>
                <input type="text" id="ideaTags" placeholder="e.g., birthday, party, celebration">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="ideaMascot" checked style="margin-right: 8px;">
                    Use mascot in this ad
                </label>
            </div>
            <button onclick="addIdea()" class="btn btn-primary">➕ Add Idea</button>
            
            <h3 style="margin-top: 30px;">Your Ideas</h3>
            <div id="ideasList" class="grid"></div>
        </div>

        <div id="prompts" class="card hidden">
            <h2>🎨 Add New Prompt DNA</h2>
            <div class="form-group">
                <label>DNA Name</label>
                <input type="text" id="promptName" placeholder="e.g., TumbleTown Classic">
            </div>
            <div class="form-group">
                <label>Base Prompt</label>
                <textarea id="promptText" placeholder="e.g., Create a vibrant marketing image for TumbleTown indoor playground featuring"></textarea>
            </div>
            <div class="grid">
                <div class="form-group">
                    <label>Style</label>
                    <input type="text" id="promptStyle" placeholder="e.g., bright, cheerful, professional">
                </div>
                <div class="form-group">
                    <label>Mood</label>
                    <input type="text" id="promptMood" placeholder="e.g., joyful, exciting, family-friendly">
                </div>
                <div class="form-group">
                    <label>Colors (comma separated)</label>
                    <input type="text" id="promptColors" placeholder="e.g., red, blue, yellow, green">
                </div>
            </div>
            <button onclick="addPromptDNA()" class="btn btn-primary">➕ Add Prompt DNA</button>
            
            <h3 style="margin-top: 30px;">Your Prompt DNA</h3>
            <div id="promptsList" class="grid"></div>
        </div>

        <div id="assets" class="card hidden">
            <h2>📁 Upload Assets</h2>
            <p>Upload your logo, mascot, and background images for ad composition</p>
            
            <div class="grid">
                <div>
                    <h3>📎 Logo</h3>
                    <div class="upload-area" onclick="document.getElementById('logoUpload').click()">
                        <p>Click to upload logo</p>
                        <input type="file" id="logoUpload" accept="image/*" style="display: none;" onchange="uploadAsset('logo')">
                    </div>
                    <div id="logoList"></div>
                </div>
                <div>
                    <h3>🎭 Mascot</h3>
                    <div class="upload-area" onclick="document.getElementById('mascotUpload').click()">
                        <p>Click to upload mascot</p>
                        <input type="file" id="mascotUpload" accept="image/*" style="display: none;" onchange="uploadAsset('mascot')">
                    </div>
                    <div id="mascotList"></div>
                </div>
                <div>
                    <h3>🖼️ Background</h3>
                    <div class="upload-area" onclick="document.getElementById('backgroundUpload').click()">
                        <p>Click to upload background</p>
                        <input type="file" id="backgroundUpload" accept="image/*" style="display: none;" onchange="uploadAsset('background')">
                    </div>
                    <div id="backgroundList"></div>
                </div>
                <div>
                    <h3>📷 Photos</h3>
                    <div class="upload-area" onclick="document.getElementById('photoUpload').click()">
                        <p>Click to upload photos</p>
                        <input type="file" id="photoUpload" accept="image/*" style="display: none;" onchange="uploadAsset('photo')">
                    </div>
                    <div id="photoList"></div>
                </div>
            </div>
        </div>

        <div id="posts" class="card hidden">
            <h2>📸 Generated Posts</h2>
            <div id="postsList"></div>
        </div>
    </div>

    <script>
        let currentData = { ideas: [], prompts: [], assets: [], posts: [] };

        function showTab(tabName) {
            document.querySelectorAll('.card').forEach(card => card.classList.add('hidden'));
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            
            document.getElementById(tabName).classList.remove('hidden');
            event.target.classList.add('active');
            
            loadData();
        }

        function showMessage(text, type = 'success') {
            const messageEl = document.getElementById('message');
            messageEl.innerHTML = '<div class="message ' + type + '">' + text + '</div>';
            setTimeout(() => messageEl.innerHTML = '', 5000);
        }

        async function loadData() {
            try {
                const [ideas, prompts, assets, posts] = await Promise.all([
                    fetch('/api/ideas').then(r => r.json()),
                    fetch('/api/prompt-dna').then(r => r.json()),
                    fetch('/api/assets').then(r => r.json()),
                    fetch('/api/posts').then(r => r.json())
                ]);

                currentData.ideas = ideas.ideas || [];
                currentData.prompts = prompts.promptDNAs || [];
                currentData.assets = assets.assets || [];
                currentData.posts = posts.posts || [];

                updateStats();
                renderIdeas();
                renderPrompts();
                renderAssets();
                renderPosts();
            } catch (error) {
                showMessage('Failed to load data', 'error');
            }
        }

        function updateStats() {
            document.getElementById('statsIdeas').textContent = currentData.ideas.length;
            document.getElementById('statsUnused').textContent = currentData.ideas.filter(i => !i.is_used).length;
            document.getElementById('statsPosts').textContent = currentData.posts.length;
        }

        function renderIdeas() {
            const container = document.getElementById('ideasList');
            container.innerHTML = currentData.ideas.map(idea => 
                '<div class="idea-card ' + (idea.is_used ? 'used' : '') + '">' +
                '<h3>' + idea.title + '</h3>' +
                '<p>' + idea.description + '</p>' +
                (idea.tags && idea.tags.length > 0 ? '<div style="margin: 12px 0;">' + idea.tags.map(tag => '<span class="tag">' + tag + '</span>').join('') + '</div>' : '') +
                '<div style="margin-top: 12px; font-size: 14px; color: #6b7280;">' +
                (idea.use_mascot ? '🎭 Uses Mascot • ' : '') +
                (idea.is_used ? '<span style="color: #10b981;">✅ Used</span>' : '<span>📝 Ready to use</span>') +
                '</div></div>'
            ).join('') || '<p>No ideas added yet. Add your first idea above!</p>';
        }

        function renderPrompts() {
            const container = document.getElementById('promptsList');
            container.innerHTML = currentData.prompts.map(prompt => 
                '<div class="card" style="margin: 0;">' +
                '<h3>' + prompt.name + '</h3>' +
                '<p>' + prompt.prompt + '</p>' +
                '<div style="margin-top: 12px; font-size: 14px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">' +
                '<div><strong>Style:</strong> ' + (prompt.style || 'Not specified') + '</div>' +
                '<div><strong>Mood:</strong> ' + (prompt.mood || 'Not specified') + '</div>' +
                '<div><strong>Colors:</strong> ' + (prompt.colors ? prompt.colors.join(', ') : 'Not specified') + '</div>' +
                '</div>' +
                (prompt.is_active ? '<div style="margin-top: 12px;"><span class="status-badge">Active</span></div>' : '') +
                '</div>'
            ).join('') || '<p>No prompt DNA added yet. Add your first template above!</p>';
        }

        function renderAssets() {
            ['logo', 'mascot', 'background', 'photo'].forEach(type => {
                const container = document.getElementById(type + 'List');
                const assets = currentData.assets.filter(asset => asset.type === type);
                container.innerHTML = assets.map(asset => 
                    '<div class="asset-item">' +
                    '<span style="font-size: 14px;">' + asset.name + '</span>' +
                    '<img src="/' + asset.path + '" class="asset-thumb" alt="' + asset.name + '">' +
                    '</div>'
                ).join('') || '<p style="color: #6b7280; font-style: italic; font-size: 14px;">No ' + type + 's uploaded yet</p>';
            });
        }

        function renderPosts() {
            const container = document.getElementById('postsList');
            if (currentData.posts.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px;"><h3>📸 No Posts Generated Yet</h3><p>Click "Generate Ad Now" to create your first post!</p><button onclick="showTab(\'dashboard\')" class="btn btn-success">🎪 Go Generate</button></div>';
                return;
            }
            
            container.innerHTML = '<div class="grid">' + currentData.posts.map(post => 
                '<div class="card" style="margin: 0;">' +
                '<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">' +
                '<div><h3>' + (post.idea_title || 'Generated Ad') + '</h3>' +
                '<p style="color: #6b7280; margin: 4px 0; font-size: 14px;">Generated: ' + new Date(post.generated_at).toLocaleDateString() + '</p></div>' +
                '<span class="status-badge">' + post.status + '</span>' +
                '</div>' +
                (post.final_image_path ? '<img src="/' + post.final_image_path + '" class="post-image" alt="Generated ad">' : '') +
                '<div style="font-size: 14px; color: #6b7280; margin: 16px 0;">' +
                '<p><strong>Service:</strong> ' + (post.image_service || 'Pollinations AI') + '</p>' +
                '<p><strong>Cost:</strong> $0.00</p>' +
                '</div>' +
                (post.is_private && post.private_url ? 
                    '<div class="private-link">' +
                    '<p style="margin: 0 0 10px 0; font-weight: bold; color: #5b21b6;">🔒 Private Access</p>' +
                    '<p style="margin: 0 0 10px 0; font-size: 12px; color: #7c3aed;">Views: ' + (post.view_count || 0) + ' | Expires: ' + (post.expires_at ? new Date(post.expires_at).toLocaleDateString() : 'Never') + '</p>' +
                    '<button onclick="copyPrivateLink(\'' + post.private_url + '\')" class="btn btn-primary" style="font-size: 12px; padding: 8px 12px;">📋 Copy Link</button> ' +
                    '<button onclick="window.open(\'' + post.private_url + '\', \'_blank\')" class="btn btn-primary" style="font-size: 12px; padding: 8px 12px;">👁️ Preview</button>' +
                    '</div>' : ''
                ) +
                '</div>'
            ).join('') + '</div>';
        }

        async function addIdea() {
            const title = document.getElementById('ideaTitle').value.trim();
            const description = document.getElementById('ideaDescription').value.trim();
            const tags = document.getElementById('ideaTags').value.trim();
            const useMascot = document.getElementById('ideaMascot').checked;

            if (!title || !description) {
                showMessage('Please fill in title and description', 'error');
                return;
            }

            try {
                const response = await fetch('/api/ideas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        description,
                        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                        useMascot
                    })
                });

                if (response.ok) {
                    document.getElementById('ideaTitle').value = '';
                    document.getElementById('ideaDescription').value = '';
                    document.getElementById('ideaTags').value = '';
                    document.getElementById('ideaMascot').checked = true;
                    
                    showMessage('✅ Idea added successfully!');
                    loadData();
                } else {
                    showMessage('Failed to add idea', 'error');
                }
            } catch (error) {
                showMessage('Failed to add idea', 'error');
            }
        }

        async function addPromptDNA() {
            const name = document.getElementById('promptName').value.trim();
            const prompt = document.getElementById('promptText').value.trim();
            const style = document.getElementById('promptStyle').value.trim();
            const mood = document.getElementById('promptMood').value.trim();
            const colors = document.getElementById('promptColors').value.trim();

            if (!name || !prompt) {
                showMessage('Please fill in name and prompt', 'error');
                return;
            }

            try {
                const response = await fetch('/api/prompt-dna', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        prompt,
                        style,
                        mood,
                        colors: colors ? colors.split(',').map(color => color.trim()).filter(color => color) : []
                    })
                });

                if (response.ok) {
                    document.getElementById('promptName').value = '';
                    document.getElementById('promptText').value = '';
                    document.getElementById('promptStyle').value = '';
                    document.getElementById('promptMood').value = '';
                    document.getElementById('promptColors').value = '';
                    
                    showMessage('✅ Prompt DNA added successfully!');
                    loadData();
                } else {
                    showMessage('Failed to add prompt DNA', 'error');
                }
            } catch (error) {
                showMessage('Failed to add prompt DNA', 'error');
            }
        }

        async function uploadAsset(type) {
            const fileInput = document.getElementById(type + 'Upload');
            const file = fileInput.files[0];
            
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            formData.append('name', file.name);

            try {
                const response = await fetch('/api/assets', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    fileInput.value = '';
                    showMessage('✅ ' + type + ' uploaded successfully!');
                    loadData();
                } else {
                    showMessage('❌ Failed to upload ' + type, 'error');
                }
            } catch (error) {
                showMessage('❌ Failed to upload ' + type, 'error');
            }
        }

        async function generateAd() {
            const btn = document.getElementById('generateBtn');
            const status = document.getElementById('generateStatus');
            
            if (currentData.ideas.filter(i => !i.is_used).length === 0) {
                showMessage('⚠️ No unused ideas available. Add some ideas first!', 'error');
                return;
            }

            if (currentData.prompts.length === 0) {
                showMessage('⚠️ No prompt DNA available. Add prompt DNA first!', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = '🎨 Generating...';
            status.innerHTML = '<div style="color: #6b7280;">Creating your beautiful playground ad...</div>';

            try {
                const response = await fetch('/api/generate-ad', { method: 'POST' });
                const data = await response.json();

                if (data.success) {
                    status.innerHTML = '<div style="color: #10b981; font-weight: bold;">🎉 Ad generated successfully!</div>';
                    showMessage('🎉 Beautiful playground ad generated successfully!');
                    loadData();
                    setTimeout(() => {
                        showTab('posts');
                        document.querySelector('[onclick*="posts"]').click();
                    }, 2000);
                } else {
                    status.innerHTML = '<div style="color: #dc2626;">❌ Failed to generate ad: ' + (data.error || 'Unknown error') + '</div>';
                    showMessage('❌ Failed to generate ad: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                status.innerHTML = '<div style="color: #dc2626;">❌ Failed to generate ad</div>';
                showMessage('❌ Failed to generate ad', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '🎪 Generate Ad Now';
            }
        }

        function copyPrivateLink(privateUrl) {
            const fullUrl = window.location.origin + privateUrl;
            navigator.clipboard.writeText(fullUrl).then(() => {
                showMessage('📋 Private link copied to clipboard!');
            }).catch(() => {
                showMessage('Failed to copy link', 'error');
            });
        }

    // Expose functions to window for inline HTML event handlers
    window.showTab = showTab;
    window.addIdea = addIdea;
    window.addPromptDNA = addPromptDNA;
    window.uploadAsset = uploadAsset;
    window.generateAd = generateAd;
    window.copyPrivateLink = copyPrivateLink;
    // Initialize
    loadData();
    </script>
</body>
</html>`);
});

module.exports = router;
