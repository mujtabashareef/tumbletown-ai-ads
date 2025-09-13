// TumbleTown AI Ad Generator - 100% FREE VERSION
// No Gemini needed! Uses only Pollinations AI + PostgreSQL + Railway
// Total monthly cost: $0-5 (just hosting)

const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('uploads'));
app.use('/uploads', express.static('uploads'));

// PostgreSQL Database Setup (FREE on Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database initialization
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ideas (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        tags JSONB DEFAULT '[]',
        use_mascot BOOLEAN DEFAULT true,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prompt_dnas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        style VARCHAR(255),
        mood VARCHAR(255),
        colors JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        filename VARCHAR(255),
        type VARCHAR(50) CHECK(type IN ('logo', 'mascot', 'background', 'photo')),
        path VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS generated_posts (
        id SERIAL PRIMARY KEY,
        idea_id INTEGER REFERENCES ideas(id),
        prompt_dna_id INTEGER REFERENCES prompt_dnas(id),
        image_path TEXT,
        final_image_path TEXT,
        prompt TEXT,
        image_service VARCHAR(100) DEFAULT 'Pollinations AI',
        generation_cost DECIMAL(10,4) DEFAULT 0.0,
        status VARCHAR(50) CHECK(status IN ('pending', 'generated', 'posted', 'failed', 'private')) DEFAULT 'private',
        is_private BOOLEAN DEFAULT true,
        access_token VARCHAR(255),
        private_url VARCHAR(500),
        view_count INTEGER DEFAULT 0,
        last_viewed TIMESTAMP,
        expires_at TIMESTAMP,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        posted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS view_analytics (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES generated_posts(id),
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_ideas_unused ON ideas(is_used, created_at);
      CREATE INDEX IF NOT EXISTS idx_posts_private ON generated_posts(is_private, access_token);
    `);
    
    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// File Upload Configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = `uploads/${req.body.type || 'general'}`;
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Utility functions
const generateAccessToken = () => require('crypto').randomBytes(32).toString('hex');
const createPrivateUrl = (postId, token) => `/private/${postId}/${token}`;

// Authentication middleware
const authenticateOwner = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const ownerToken = process.env.OWNER_ACCESS_TOKEN || 'tumbletown-owner-2024';
  
  if (token === ownerToken) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized access' });
  }
};

// Simple prompt creation (NO AI needed - just template-based)
function createPrompt(idea, promptDNA) {
  const basePrompt = promptDNA.prompt || "Create a vibrant marketing image for TumbleTown indoor playground featuring";
  const style = promptDNA.style || "bright, cheerful, professional photography";
  const mood = promptDNA.mood || "joyful, exciting, family-friendly";
  const colors = promptDNA.colors?.join(', ') || "bright primary colors";
  
  let prompt = `${basePrompt} ${idea.description}.`;
  
  // Add playground-specific elements
  prompt += " Indoor playground with colorful equipment including slides, ball pits, climbing structures.";
  prompt += " Happy children aged 3-10 playing safely.";
  prompt += " Bright, welcoming atmosphere with good lighting.";
  prompt += " Professional marketing photography quality.";
  prompt += " Family-friendly and trustworthy environment.";
  
  if (idea.use_mascot) {
    prompt += " Include friendly playground mascot character.";
  }
  
  prompt += ` Style: ${style}.`;
  prompt += ` Mood: ${mood}.`;
  prompt += ` Colors: ${colors}.`;
  prompt += " High resolution, suitable for social media marketing.";
  
  return prompt;
}

// FREE Image Generation using Pollinations AI
async function generateWithPollinations(prompt) {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Try enhanced version first
    let imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&enhance=true&model=flux-realism&nologo=true`;
    
    try {
      const response = await axios.head(imageUrl, { timeout: 10000 });
      if (response.status === 200) {
        return {
          imageUrl,
          service: 'Pollinations AI (Enhanced)',
          cost: 0,
          prompt
        };
      }
    } catch (enhancedError) {
      console.log('Enhanced version failed, trying basic...');
    }
    
    // Fallback to basic version
    imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024`;
    
    return {
      imageUrl,
      service: 'Pollinations AI',
      cost: 0,
      prompt
    };
    
  } catch (error) {
    console.error('Pollinations generation failed:', error);
    throw new Error('Image generation failed');
  }
}

// Image Composition Function
async function composeImage(generatedImageUrl, backgroundAsset, logoAsset, mascotAsset, idea) {
  try {
    console.log('Downloading generated image...');
    const imageResponse = await axios.get(generatedImageUrl, { 
      responseType: 'arraybuffer', 
      timeout: 30000,
      headers: {
        'User-Agent': 'TumbleTown-Ad-Generator/1.0'
      }
    });
    const generatedImageBuffer = Buffer.from(imageResponse.data);

    console.log('Creating base composition...');
    let composition = sharp(generatedImageBuffer).resize(1080, 1080, { fit: 'cover' });

    // Add mascot if relevant and available
    if (idea.use_mascot && mascotAsset && mascotAsset.path) {
      try {
        console.log('Adding mascot...');
        const mascotBuffer = await fs.readFile(mascotAsset.path);
        const resizedMascot = await sharp(mascotBuffer)
          .resize(200, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();

        composition = composition.composite([
          {
            input: resizedMascot,
            top: 50,
            left: 50
          }
        ]);
      } catch (mascotError) {
        console.log('Mascot composition failed, continuing without mascot:', mascotError.message);
      }
    }

    // Add logo
    if (logoAsset && logoAsset.path) {
      try {
        console.log('Adding logo...');
        const logoBuffer = await fs.readFile(logoAsset.path);
        const resizedLogo = await sharp(logoBuffer)
          .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();

        composition = composition.composite([
          {
            input: resizedLogo,
            top: 900,
            left: 900,
            gravity: 'southeast'
          }
        ]);
      } catch (logoError) {
        console.log('Logo composition failed, continuing without logo:', logoError.message);
      }
    }

    // Add text overlay with idea title
    const safeTitle = idea.title.replace(/[<>&"']/g, '').substring(0, 50);
    const textSvg = `
      <svg width="1080" height="150">
        <rect x="0" y="0" width="1080" height="150" fill="rgba(0,0,0,0.7)" rx="10"/>
        <text x="540" y="85" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
              fill="white" text-anchor="middle" dominant-baseline="middle">
          ${safeTitle}
        </text>
      </svg>
    `;

    console.log('Adding title overlay...');
    composition = composition.composite([
      {
        input: Buffer.from(textSvg),
        top: 930,
        left: 0
      }
    ]);

    // Save final image
    const outputPath = `uploads/generated/final-${Date.now()}.jpg`;
    await fs.mkdir('uploads/generated', { recursive: true });
    await composition.jpeg({ quality: 90 }).toFile(outputPath);

    console.log('Image composition completed:', outputPath);
    return outputPath;
    
  } catch (error) {
    console.error('Error composing image:', error);
    
    // Fallback: just save the original generated image
    try {
      console.log('Using fallback image save...');
      const imageResponse = await axios.get(generatedImageUrl, { responseType: 'arraybuffer' });
      const outputPath = `uploads/generated/simple-${Date.now()}.jpg`;
      await fs.mkdir('uploads/generated', { recursive: true });
      await fs.writeFile(outputPath, imageResponse.data);
      return outputPath;
    } catch (fallbackError) {
      console.error('Fallback image save failed:', fallbackError);
      return generatedImageUrl; // Return original URL as last resort
    }
  }
}

// Daily Ad Generation Job
async function generateDailyAd() {
  try {
    console.log('🎪 Starting daily ad generation...');

    // Get unused idea
    const ideaResult = await pool.query(
      'SELECT * FROM ideas WHERE is_used = false ORDER BY created_at ASC LIMIT 1'
    );
    
    if (ideaResult.rows.length === 0) {
      console.log('❌ No unused ideas available');
      return;
    }
    
    const idea = ideaResult.rows[0];
    console.log('✅ Selected idea:', idea.title);

    // Get active prompt DNA
    const promptResult = await pool.query(
      'SELECT * FROM prompt_dnas WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    if (promptResult.rows.length === 0) {
      console.log('❌ No active prompt DNA available');
      return;
    }
    
    const promptDNA = promptResult.rows[0];
    console.log('✅ Using prompt DNA:', promptDNA.name);

    // Get assets
    const [logoResult, mascotResult, backgroundResult] = await Promise.all([
      pool.query('SELECT * FROM assets WHERE type = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1', ['logo']),
      pool.query('SELECT * FROM assets WHERE type = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1', ['mascot']),
      pool.query('SELECT * FROM assets WHERE type = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1', ['background'])
    ]);

    const logoAsset = logoResult.rows[0];
    const mascotAsset = mascotResult.rows[0];
    const backgroundAsset = backgroundResult.rows[0];

    console.log('🎨 Creating prompt...');
    const prompt = createPrompt(idea, promptDNA);
    console.log('Generated prompt:', prompt);

    console.log('🖼️ Generating image with Pollinations AI...');
    const imageResult = await generateWithPollinations(prompt);
    console.log(`✅ Image generated using ${imageResult.service}`);

    console.log('🎭 Composing final image...');
    const finalImagePath = await composeImage(imageResult.imageUrl, backgroundAsset, logoAsset, mascotAsset, idea);

    // Save post record
    const accessToken = generateAccessToken();
    const postResult = await pool.query(`
      INSERT INTO generated_posts (
        idea_id, prompt_dna_id, image_path, final_image_path, prompt, 
        image_service, generation_cost, status, is_private, access_token, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [
      idea.id, promptDNA.id, imageResult.imageUrl, finalImagePath, prompt,
      imageResult.service, imageResult.cost, 'private', true, accessToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    ]);

    const post = postResult.rows[0];

    // Create private URL
    const privateUrl = createPrivateUrl(post.id, accessToken);
    await pool.query('UPDATE generated_posts SET private_url = $1 WHERE id = $2', [privateUrl, post.id]);

    // Mark idea as used
    await pool.query('UPDATE ideas SET is_used = true, used_at = CURRENT_TIMESTAMP WHERE id = $1', [idea.id]);

    console.log('🎉 Daily ad generated successfully!');
    console.log(`📁 Final image: ${finalImagePath}`);
    console.log(`🔗 Private URL: ${privateUrl}`);
    console.log(`💰 Total cost: $${imageResult.cost} (FREE!)`);
    
    return post;

  } catch (error) {
    console.error('❌ Error generating daily ad:', error);
    throw error;
  }
}

// Private post viewing endpoint
app.get('/private/:postId/:token', async (req, res) => {
  try {
    const { postId, token } = req.params;
    
    const post = await pool.query(
      'SELECT * FROM generated_posts WHERE id = $1 AND access_token = $2',
      [postId, token]
    );
    
    if (post.rows.length === 0) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1>🔒 Access Denied</h1>
            <p>This private link is invalid or has expired.</p>
          </body>
        </html>
      `);
    }

    const postData = post.rows[0];

    // Check if link has expired
    if (postData.expires_at && new Date() > postData.expires_at) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1>⏰ Link Expired</h1>
            <p>This private link has expired.</p>
          </body>
        </html>
      `);
    }

    // Update view count
    await pool.query(
      'UPDATE generated_posts SET view_count = view_count + 1, last_viewed = CURRENT_TIMESTAMP WHERE id = $1',
      [postId]
    );

    // Get idea details
    const ideaResult = await pool.query('SELECT * FROM ideas WHERE id = $1', [postData.idea_id]);
    const idea = ideaResult.rows[0];
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TumbleTown Private Ad - ${idea?.title || 'Generated Ad'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .container {
              max-width: 600px;
              background: white;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              text-align: center;
            }
            .header {
              color: #6B46C1;
              margin-bottom: 20px;
            }
            .ad-image {
              max-width: 100%;
              border-radius: 10px;
              box-shadow: 0 10px 20px rgba(0,0,0,0.1);
              margin: 20px 0;
            }
            .info {
              color: #666;
              font-size: 14px;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .stats {
              display: flex;
              justify-content: space-around;
              margin-top: 15px;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
            }
            .stat {
              text-align: center;
            }
            .stat-number {
              font-weight: bold;
              color: #6B46C1;
            }
            .free-badge {
              background: #10B981;
              color: white;
              padding: 5px 10px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: bold;
            }
            @media (max-width: 480px) {
              body { padding: 10px; }
              .container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎪 ${idea?.title || 'TumbleTown Ad'}</h1>
              <p>${idea?.description || 'Generated advertisement'}</p>
              <span class="free-badge">100% FREE Generation</span>
            </div>
            
            <img src="/${postData.final_image_path || postData.image_path}" alt="Generated Ad" class="ad-image" />
            
            <div class="info">
              <div class="stats">
                <div class="stat">
                  <div class="stat-number">${postData.view_count + 1}</div>
                  <div>Views</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${new Date(postData.generated_at).toLocaleDateString()}</div>
                  <div>Created</div>
                </div>
                <div class="stat">
                  <div class="stat-number">$0.00</div>
                  <div>Cost</div>
                </div>
              </div>
              
              <p><small>🔒 Private preview for TumbleTown Playground</small></p>
              <p><small>🤖 Generated with Pollinations AI • 100% Free</small></p>
            </div>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error viewing private post:', error);
    res.status(500).send('Something went wrong');
  }
});

// API Routes

// Ideas Management
app.post('/api/ideas', async (req, res) => {
  try {
    const { title, description, tags, useMascot } = req.body;
    const result = await pool.query(
      'INSERT INTO ideas (title, description, tags, use_mascot) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, JSON.stringify(tags || []), useMascot]
    );
    res.json({ success: true, idea: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/ideas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ideas ORDER BY created_at DESC');
    res.json({ success: true, ideas: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/ideas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ideas WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Prompt DNA Management
app.post('/api/prompt-dna', async (req, res) => {
  try {
    const { name, prompt, style, mood, colors } = req.body;
    const result = await pool.query(
      'INSERT INTO prompt_dnas (name, prompt, style, mood, colors) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, prompt, style, mood, JSON.stringify(colors || [])]
    );
    res.json({ success: true, promptDNA: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/prompt-dna', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prompt_dnas WHERE is_active = true ORDER BY created_at DESC');
    res.json({ success: true, promptDNAs: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Asset Management
app.post('/api/assets', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const result = await pool.query(
      'INSERT INTO assets (name, filename, type, path) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.body.name || req.file.originalname, req.file.filename, req.body.type, req.file.path]
    );

    res.json({ success: true, asset: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/assets', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM assets WHERE is_active = true';
    const params = [];
    
    if (type) {
      query += ' AND type = $1';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, assets: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generated Posts
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, i.title as idea_title, i.description as idea_description, pd.name as prompt_dna_name
      FROM generated_posts p
      LEFT JOIN ideas i ON p.idea_id = i.id
      LEFT JOIN prompt_dnas pd ON p.prompt_dna_id = pd.id
      ORDER BY p.generated_at DESC
    `);
    res.json({ success: true, posts: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual ad generation
app.post('/api/generate-ad', async (req, res) => {
  try {
    const post = await generateDailyAd();
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate private link
app.post('/api/posts/:id/private-link', authenticateOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { expiryDays = 7 } = req.body;
    
    const post = await pool.query('SELECT * FROM generated_posts WHERE id = $1', [id]);
    if (post.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const accessToken = generateAccessToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    const privateUrl = createPrivateUrl(id, accessToken);

    await pool.query(
      'UPDATE generated_posts SET access_token = $1, expires_at = $2, private_url = $3 WHERE id = $4',
      [accessToken, expiresAt, privateUrl, id]
    );

    const fullUrl = `${req.protocol}://${req.get('host')}${privateUrl}`;

    res.json({
      success: true,
      privateUrl: fullUrl,
      expiresAt: expiresAt,
      accessToken: accessToken
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'TumbleTown AI Ad Generator',
    cost: '$0.00 per ad',
    features: ['Pollinations AI', 'PostgreSQL', 'Railway Hosting']
  });
});

// Schedule daily generation (9 AM every day)
cron.schedule('0 9 * * *', () => {
  console.log('🕘 Scheduled daily ad generation triggered');
  generateDailyAd().catch(error => {
    console.error('Scheduled ad generation failed:', error);
  });
}, {
  timezone: process.env.TIMEZONE || 'America/New_York'
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🎪 TumbleTown AI Ad Generator running on port ${PORT}`);
      console.log('💰 100% FREE version - No API costs!');
      console.log('🤖 Using Pollinations AI for image generation');
      console.log('📅 Daily ad generation scheduled for 9:00 AM');
      console.log('🔗 Health check: /health');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;