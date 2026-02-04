import { Pool, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Disable WebSocket to use HTTP for better compatibility
neonConfig.webSocketConstructor = undefined;

// Database configuration for Neon
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: databaseUrl });

export async function connectToPostgres() {
  return pool;
}

// Type definitions
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  balance?: number;
  role?: 'user' | 'parent';
  createdAt?: Date;
}

export interface Friend {
  userId: string;
  friendId: string;
  createdAt?: Date;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt?: Date;
}

export interface Expense {
  id: string;
  userId: string;
  groupId?: string;
  category: string;
  subcategory?: string;
  amount: number;
  description?: string;
  createdAt?: Date;
}

export interface ExpenseSplit {
  expenseId: string;
  userId: string;
  amount: number;
}

export interface Receipt {
  id: string;
  expenseId: string;
  fileUrl: string;
  uploadedAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  status: 'pending' | 'read';
  createdAt?: Date;
}

export interface ParentChildRelationship {
  id: string;
  parentId: string;
  childId: string;
  thresholdAmount: number;
  createdAt?: Date;
}

export interface NotificationLog {
  id: string;
  relationshipId: string;
  type: 'spending_threshold' | 'safety_alert';
  alertType?: 'threshold_50' | 'threshold_90' | 'threshold_100' | 'unsafe_item';
  message: string;
  sentAt?: Date;
}

// Initialize database schema
export async function initializeDatabase() {
  const db = await connectToPostgres();
  
  try {
    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        balance DECIMAL(10,2) DEFAULT 0,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'parent')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Friends table
    await db.query(`
      CREATE TABLE IF NOT EXISTS friends (
        user_id VARCHAR(255) REFERENCES users(id),
        friend_id VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, friend_id)
      )
    `);

    // Groups table
    await db.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Group members table
    await db.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id VARCHAR(255) REFERENCES groups(id),
        user_id VARCHAR(255) REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (group_id, user_id)
      )
    `);

    // Expenses table
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        group_id VARCHAR(255) REFERENCES groups(id),
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Expense splits table
    await db.query(`
      CREATE TABLE IF NOT EXISTS expense_splits (
        expense_id VARCHAR(255) REFERENCES expenses(id),
        user_id VARCHAR(255) REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (expense_id, user_id)
      )
    `);

    // Receipts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_id VARCHAR(255) REFERENCES expenses(id),
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id),
        type VARCHAR(50) DEFAULT 'general',
        message TEXT,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Bills table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id),
        filename VARCHAR(255) NOT NULL,
        merchant_name VARCHAR(255),
        total_amount DECIMAL(10,2),
        bill_date DATE,
        raw_ocr_text TEXT,
        parsed_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Bill items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id VARCHAR(255) REFERENCES bills(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER DEFAULT 1,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Parent-child relationships table
    await db.query(`
      CREATE TABLE IF NOT EXISTS parent_child_relationships (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        child_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        threshold_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(parent_id, child_id)
      )
    `);

    // Notification logs table for tracking sent notifications
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        relationship_id VARCHAR(255) REFERENCES parent_child_relationships(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('spending_threshold', 'safety_alert')),
        alert_type VARCHAR(50),
        message TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
