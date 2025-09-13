// services/adGenerator.js - Ad Generation Service
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs').promises;
const { pool } = require('../../config/database');
const { generateAccessToken, createPrivateUrl } = require('../../utils/helpers');

// Simple prompt creation
function createPrompt(idea, promptDNA) {
  const basePrompt = promptDNA.prompt || "Create a vibrant marketing image for TumbleTown indoor playground featuring";
  const style = promptDNA.style || "bright, cheerful, professional photography";
  const mood = promptDNA.mood || "joyful, exciting, family-friendly";
  const colors = promptDNA.colors?.join(', ') || "bright primary colors";
  
  let prompt = `${basePrompt} ${idea.description}.`;
  
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

    const outputPath = `uploads/generated/final-${Date.now()}.jpg`;
    await fs.mkdir('uploads/generated', { recursive: true });
    await composition.jpeg({ quality: 90 }).toFile(outputPath);

    console.log('Image composition completed:', outputPath);
    return outputPath;
    
  } catch (error) {
    console.error('Error composing image:', error);
    
    try {
      console.log('Using fallback image save...');
      const imageResponse = await axios.get(generatedImageUrl, { responseType: 'arraybuffer' });
      const outputPath = `uploads/generated/simple-${Date.now()}.jpg`;
      await fs.mkdir('uploads/generated', { recursive: true });
      await fs.writeFile(outputPath, imageResponse.data);
      return outputPath;
    } catch (fallbackError) {
      console.error('Fallback image save failed:', fallbackError);
      return generatedImageUrl;
    }
  }
}

// Daily Ad Generation Job
async function generateDailyAd() {
  try {
    console.log('🎪 Starting daily ad generation...');

    const ideaResult = await pool.query(
      'SELECT * FROM ideas WHERE is_used = false ORDER BY created_at ASC LIMIT 1'
    );
    
    if (ideaResult.rows.length === 0) {
      console.log('❌ No unused ideas available');
      return;
    }
    
    const idea = ideaResult.rows[0];
    console.log('✅ Selected idea:', idea.title);

    const promptResult = await pool.query(
      'SELECT * FROM prompt_dnas WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    if (promptResult.rows.length === 0) {
      console.log('❌ No active prompt DNA available');
      return;
    }
    
    const promptDNA = promptResult.rows[0];
    console.log('✅ Using prompt DNA:', promptDNA.name);

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

    const accessToken = generateAccessToken();
    const postResult = await pool.query(`
      INSERT INTO generated_posts (
        idea_id, prompt_dna_id, image_path, final_image_path, prompt, 
        image_service, generation_cost, status, is_private, access_token, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [
      idea.id, promptDNA.id, imageResult.imageUrl, finalImagePath, prompt,
      imageResult.service, imageResult.cost, 'private', true, accessToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ]);

    const post = postResult.rows[0];

    const privateUrl = createPrivateUrl(post.id, accessToken);
    await pool.query('UPDATE generated_posts SET private_url = $1 WHERE id = $2', [privateUrl, post.id]);

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

module.exports = {
  generateDailyAd,
  createPrompt,
  generateWithPollinations,
  composeImage
};
