import { config } from 'dotenv';
import { initializeDatabase } from '../lib/db.js';

// Load environment variables
config({ path: '.env.local' });

async function setupDatabase() {
  try {
    console.log('Setting up database schema...');
    await initializeDatabase();
    console.log('Database schema created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to setup database:', error);
    process.exit(1);
  }
}

setupDatabase();
