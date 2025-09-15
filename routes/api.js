// routes/api.js - API Routes
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { upload } = require('../config/upload');
const { generateDailyAd } = require('../configuration/services/adGenerator');
const { authenticateOwner } = require('../utils/helpers');

// Ideas Management
router.post('/ideas', async (req, res) => {
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

router.get('/ideas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ideas ORDER BY created_at DESC');
    res.json({ success: true, ideas: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/ideas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ideas WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Prompt DNA Management
router.post('/prompt-dna', async (req, res) => {
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

router.get('/prompt-dna', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prompt_dnas WHERE is_active = true ORDER BY created_at DESC');
    res.json({ success: true, promptDNAs: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Asset Management
router.post('/assets', upload.single('file'), async (req, res) => {
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

router.get('/assets', async (req, res) => {
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
router.get('/posts', async (req, res) => {
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
router.post('/generate-ad', async (req, res) => {
  try {
    console.log('Starting manual ad generation...');
    const post = await generateDailyAd();
    console.log('Generated post:', post);
    res.json({ success: true, post });
  } catch (error) {
    console.error('Error in generate-ad endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate private link (protected route)
router.post('/posts/:id/private-link', authenticateOwner, async (req, res) => {
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

module.exports = router;
