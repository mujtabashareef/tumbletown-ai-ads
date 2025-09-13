// config/database.js - Database Configuration
const { Pool } = require('pg');

// PostgreSQL Database Setup
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

      CREATE INDEX IF NOT EXISTS idx_ideas_unused ON ideas(is_used, created_at);
      CREATE INDEX IF NOT EXISTS idx_posts_private ON generated_posts(is_private, access_token);
    `);
    
    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = { pool, initDatabase };