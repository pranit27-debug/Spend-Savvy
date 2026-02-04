import { config } from 'dotenv';
import { connectToPostgres } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: '.env.local' });

async function addTestData() {
  try {
    console.log('Adding test data to database...');
    const db = await connectToPostgres();

    // Add test users
    const userId1 = "1f2d1bd7-fa51-403f-a6ae-7aefc30cbbf3";
    const userId2 = uuidv4();
    const userId3 = uuidv4();

    await db.query(`
      INSERT INTO users (id, name, email, password, balance) VALUES 
      ($1, 'John Doe', 'john@example.com', 'hashed_password', 150.00),
      ($2, 'Jane Smith', 'jane@example.com', 'hashed_password', -75.50),
      ($3, 'Bob Wilson', 'bob@example.com', 'hashed_password', 25.25)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        balance = EXCLUDED.balance
    `, [userId1, userId2, userId3]);

    // Add a test group
    const groupId1 = uuidv4();
    await db.query(`
      INSERT INTO groups (id, name, created_by) VALUES 
      ($1, 'Roommates', $2)
      ON CONFLICT (id) DO NOTHING
    `, [groupId1, userId1]);

    // Add group members
    await db.query(`
      INSERT INTO group_members (group_id, user_id) VALUES 
      ($1, $2),
      ($1, $3),
      ($1, $4)
      ON CONFLICT (group_id, user_id) DO NOTHING
    `, [groupId1, userId1, userId2, userId3]);

    // Add test expenses
    const expenseId1 = uuidv4();
    const expenseId2 = uuidv4();
    const expenseId3 = uuidv4();

    await db.query(`
      INSERT INTO expenses (id, user_id, group_id, category, amount, description) VALUES 
      ($1, $2, $3, 'food', 120.00, 'Dinner at Italian Restaurant'),
      ($4, $5, $3, 'entertainment', 45.00, 'Movie tickets for group'),
      ($6, $7, $3, 'utilities', 180.00, 'Monthly electricity bill')
      ON CONFLICT (id) DO NOTHING
    `, [expenseId1, userId1, groupId1, expenseId2, userId2, expenseId3, userId3]);

    // Add expense splits
    await db.query(`
      INSERT INTO expense_splits (expense_id, user_id, amount) VALUES 
      ($1, $2, 40.00),
      ($1, $3, 40.00),
      ($1, $4, 40.00),
      ($5, $2, 15.00),
      ($5, $3, 15.00),
      ($5, $4, 15.00),
      ($6, $2, 60.00),
      ($6, $3, 60.00),
      ($6, $4, 60.00)
      ON CONFLICT (expense_id, user_id) DO UPDATE SET
        amount = EXCLUDED.amount
    `, [expenseId1, userId1, userId2, userId3, expenseId2, expenseId2, expenseId2, expenseId3, expenseId3, expenseId3]);

    // Add some notifications
    await db.query(`
      INSERT INTO notifications (user_id, type, message, is_read) VALUES 
      ($1, 'expense', 'Jane paid for Movie tickets for group', false),
      ($1, 'balance', 'Bob owes you $60.00 for Monthly electricity bill', false),
      ($2, 'expense', 'John paid for Dinner at Italian Restaurant', true)
      ON CONFLICT DO NOTHING
    `, [userId1, userId1, userId2]);

    console.log('Test data added successfully!');
    console.log('User IDs created:');
    console.log('- John Doe:', userId1);
    console.log('- Jane Smith:', userId2);
    console.log('- Bob Wilson:', userId3);
    console.log('Group ID:', groupId1);

  } catch (error) {
    console.error('Error adding test data:', error);
  }
}

addTestData();
