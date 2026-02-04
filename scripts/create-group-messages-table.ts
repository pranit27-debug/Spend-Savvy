import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function createGroupMessagesTables() {
  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
  
  try {
    console.log('Creating group messages table...');
    
    // Group messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_messages (
        id VARCHAR(255) PRIMARY KEY,
        group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);
    `);

    console.log('Group messages table created successfully');
  } catch (error) {
    console.error('Error creating group messages table:', error);
  } finally {
    await pool.end();
  }
}

createGroupMessagesTables();
