refer to the screenshot

our plan is to make an AI enhanced financial splitting chatbot using MCP (model context protocol), mcp tools, LLM orchestration.

I will use PostgreSQL to store the user info, receipt photos, expenses (month, year, week wise).

i want to integrate a feature that i will mention the money to get split among which friend in the chat input and accordingly LLM will split the task and add to the PostgreSQL DB (to get updated after every transaction).

I want to query through the chatbot for example that in the last month i have spent on coffee or how much i have spent on food/clothing etc, the llm will go through the PostgreSQL DB (timestamps, and category, sub category) and respond to the query.

the output should be llm text generated and voice as well.

suppose i want to split among ram, shyam, laal, when i write ra.. it should show me ram, rama, ramesh (all the suggestion of friend i have in the DB), then the user will choose which name to split with.

then after clicking the send button (after seventh point) the llm will create a group among those friends selected and split the money among them as desired.

the creation of groups should show other members also, and notification should go to their webapp.
10. Analytics Queries – PostgreSQL queries will allow aggregations such as total spent by category, monthly spending trends, or friend-wise contributions.
11. import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
 use all these packages to write the tools
12. use NEXT JS
13. start with creating mcp server first and then with the postgresql
14. these are some of the funtions that might be helpful // =============== USER & FRIENDS MANAGEMENT =================

// Add a new user
async function addUser(user: User) {
  const db = await connectToPostgres();
  const query = `INSERT INTO users (id, name, email, balance) VALUES ($1, $2, $3, $4) RETURNING *`;
  const values = [user.id, user.name, user.email, user.balance || 0];
  const result = await db.query(query, values);
  return result.rows[0];
}

// Fetch user details
async function getUser(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM users WHERE id = $1`, [userId]);
  return result.rows[0] || null;
}

// Add a friend
async function addFriend(userId: string, friendId: string) {
  const db = await connectToPostgres();
  const query = `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) RETURNING *`;
  const result = await db.query(query, [userId, friendId]);
  return result.rows[0];
}

// List all friends for a user
async function listFriends(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT f.friend_id, u.name 
     FROM friends f 
     JOIN users u ON f.friend_id = u.id 
     WHERE f.user_id = $1`,
    [userId]
  );
  return result.rows;
}

// Search friends by prefix
async function searchFriends(userId: string, prefix: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT u.id, u.name 
     FROM friends f 
     JOIN users u ON f.friend_id = u.id 
     WHERE f.user_id = $1 AND u.name ILIKE $2`,
    [userId, `${prefix}%`]
  );
  return result.rows;
}

// =============== GROUP MANAGEMENT =================

async function createGroup(group: Group) {
  const db = await connectToPostgres();
  const query = `INSERT INTO groups (id, name, created_by) VALUES ($1, $2, $3) RETURNING *`;
  const result = await db.query(query, [group.id, group.name, group.createdBy]);
  return result.rows[0];
}

async function getGroup(groupId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM groups WHERE id = $1`, [groupId]);
  return result.rows[0];
}

async function listGroups(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT g.* FROM groups g 
     JOIN group_members gm ON gm.group_id = g.id 
     WHERE gm.user_id = $1`,
    [userId]
  );
  return result.rows;
}

async function updateGroupMembers(groupId: string, members: string[]) {
  const db = await connectToPostgres();
  await db.query(`DELETE FROM group_members WHERE group_id = $1`, [groupId]);
  const insertPromises = members.map((m) =>
    db.query(`INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`, [
      groupId,
      m,
    ])
  );
  await Promise.all(insertPromises);
  return { groupId, members };
}

// =============== EXPENSE MANAGEMENT =================

async function addExpense(expense: Expense) {
  const db = await connectToPostgres();
  const query = `
    INSERT INTO expenses (id, user_id, group_id, category, subcategory, amount, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`;
  const values = [
    expense.id,
    expense.userId,
    expense.groupId || null,
    expense.category,
    expense.subcategory,
    expense.amount,
  ];
  const result = await db.query(query, values);
  return result.rows[0];
}

async function splitExpense(expenseId: string, splits: { userId: string; amount: number }[]) {
  const db = await connectToPostgres();
  const insertPromises = splits.map((s) =>
    db.query(
      `INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3) RETURNING *`,
      [expenseId, s.userId, s.amount]
    )
  );
  return Promise.all(insertPromises);
}

async function listExpenses(userId: string, filters?: { category?: string; startDate?: string; endDate?: string }) {
  const db = await connectToPostgres();
  let query = `SELECT * FROM expenses WHERE user_id = $1`;
  const values: any[] = [userId];
  if (filters?.category) {
    query += ` AND category = $${values.length + 1}`;
    values.push(filters.category);
  }
  if (filters?.startDate && filters?.endDate) {
    query += ` AND created_at BETWEEN $${values.length + 1} AND $${values.length + 2}`;
    values.push(filters.startDate, filters.endDate);
  }
  const result = await db.query(query, values);
  return result.rows;
}

// =============== RECEIPTS & MEDIA =================

async function uploadReceipt(expenseId: string, fileUrl: string) {
  const db = await connectToPostgres();
  const query = `INSERT INTO receipts (expense_id, file_url, uploaded_at) VALUES ($1, $2, NOW()) RETURNING *`;
  const result = await db.query(query, [expenseId, fileUrl]);
  return result.rows[0];
}

async function getReceipts(expenseId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM receipts WHERE expense_id = $1`, [expenseId]);
  return result.rows;
}

// =============== ANALYTICS =================

async function getSpendByCategory(userId: string, month: number, year: number) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT category, SUM(amount) as total
     FROM expenses
     WHERE user_id = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3
     GROUP BY category`,
    [userId, month, year]
  );
  return result.rows;
}

async function getMonthlySummary(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as total
     FROM expenses
     WHERE user_id = $1
     GROUP BY month
     ORDER BY month DESC`,
    [userId]
  );
  return result.rows;
}

async function getFriendContributions(groupId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT u.name, SUM(es.amount) as contribution
     FROM expense_splits es
     JOIN users u ON es.user_id = u.id
     WHERE es.expense_id IN (SELECT id FROM expenses WHERE group_id = $1)
     GROUP BY u.name`,
    [groupId]
  );
  return result.rows;
}

// =============== NOTIFICATIONS =================

async function pushNotification(userId: string, message: string) {
  const db = await connectToPostgres();
  const query = `INSERT INTO notifications (user_id, message, status, created_at) VALUES ($1, $2, 'pending', NOW()) RETURNING *`;
  const result = await db.query(query, [userId, message]);
  return result.rows[0];
}

async function listNotifications(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM notifications WHERE user_id = $1`, [userId]);
  return result.rows;
}

async function acknowledgeNotification(notificationId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `UPDATE notifications SET status = 'read' WHERE id = $1 RETURNING *`,
    [notificationId]
  );
  return result.rows[0];
}
