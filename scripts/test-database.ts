import { config } from 'dotenv';
import { connectToPostgres } from '../lib/db.js';

// Load environment variables
config({ path: '.env.local' });

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    const db = await connectToPostgres();
    
    // Check if users table exists and has password column
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table columns:', result.rows);
    
    // Try to query the users table
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    console.log('Current user count:', userCount.rows[0].count);
    
    console.log('Database connection test successful!');
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testDatabase();
