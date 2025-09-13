// routes/private.js - Private Link Routes
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Private post viewing endpoint
router.get('/:postId/:token', async (req, res) => {
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
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Error</h1>
          <p>Something went wrong. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

module.exports = router;