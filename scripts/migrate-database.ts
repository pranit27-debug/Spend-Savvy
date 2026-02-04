import { config } from 'dotenv';
import { connectToPostgres } from '../lib/db.js';

// Load environment variables
config({ path: '.env.local' });

async function migrateDatabase() {
  try {
    console.log('Running database migration...');
    const db = await connectToPostgres();
    
    // Check if password column exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding password column to users table...');
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';
      `);
      console.log('Password column added successfully!');
    } else {
      console.log('Password column already exists.');
    }
    
    // Verify the column was added
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Updated users table columns:', result.rows);
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();
