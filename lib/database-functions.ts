import { connectToPostgres, User, Friend, Group, Expense, ExpenseSplit, Receipt, Notification, ParentChildRelationship, NotificationLog } from './db';
import { v4 as uuidv4 } from 'uuid';

// =============== USER & FRIENDS MANAGEMENT =================

// Add a new user
export async function addUser(user: User) {
  const db = await connectToPostgres();
  const query = `INSERT INTO users (id, name, email, phone, password, balance, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
  const values = [user.id, user.name, user.email, user.phone || null, user.password || null, user.balance || 0, user.role || 'user'];
  const result = await db.query(query, values);
  return result.rows[0];
}

// Fetch user details
export async function getUser(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM users WHERE id = $1`, [userId]);
  return result.rows[0] || null;
}

// Add a friend
export async function addFriend(userId: string, friendId: string) {
  const db = await connectToPostgres();
  const query = `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) RETURNING *`;
  const result = await db.query(query, [userId, friendId]);
  return result.rows[0];
}

// Delete a friend
export async function deleteFriend(userId: string, friendId: string) {
  const db = await connectToPostgres();
  const query = `DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 RETURNING *`;
  const result = await db.query(query, [userId, friendId]);
  return result.rows[0];
}

// Check if friendship already exists
export async function checkFriendshipExists(userId: string, friendId: string) {
  const db = await connectToPostgres();
  const query = `SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2 LIMIT 1`;
  const result = await db.query(query, [userId, friendId]);
  return result.rows.length > 0;
}

// List all friends for a user
export async function listFriends(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT f.friend_id, u.name, u.email, u.phone 
     FROM friends f 
     JOIN users u ON f.friend_id = u.id 
     WHERE f.user_id = $1`,
    [userId]
  );
  return result.rows;
}

// Search friends by prefix
export async function searchFriends(userId: string, prefix: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.phone 
     FROM friends f 
     JOIN users u ON f.friend_id = u.id 
     WHERE f.user_id = $1 AND (u.name ILIKE $2 OR u.phone ILIKE $2)`,
    [userId, `${prefix}%`]
  );
  return result.rows;
}

// =============== GROUP MANAGEMENT =================

export async function createGroup(group: Group) {
  const db = await connectToPostgres();
  const query = `INSERT INTO groups (id, name, created_by) VALUES ($1, $2, $3) RETURNING *`;
  const result = await db.query(query, [group.id, group.name, group.createdBy]);
  return result.rows[0];
}

export async function getGroup(groupId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM groups WHERE id = $1`, [groupId]);
  return result.rows[0];
}

export async function listGroups(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT g.* FROM groups g 
     JOIN group_members gm ON gm.group_id = g.id 
     WHERE gm.user_id = $1`,
    [userId]
  );
  return result.rows;
}

export async function updateGroupMembers(groupId: string, members: string[]) {
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

export async function addExpense(expense: Expense) {
  const db = await connectToPostgres();
  const query = `
    INSERT INTO expenses (id, user_id, group_id, category, subcategory, amount, description, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`;
  const values = [
    expense.id,
    expense.userId,
    expense.groupId || null,
    expense.category,
    expense.subcategory,
    expense.amount,
    expense.description || null,
  ];
  const result = await db.query(query, values);
  return result.rows[0];
}

export async function splitExpense(expenseId: string, splits: { userId: string; amount: number }[]) {
  const db = await connectToPostgres();
  const insertPromises = splits.map((s) =>
    db.query(
      `INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3) RETURNING *`,
      [expenseId, s.userId, s.amount]
    )
  );
  return Promise.all(insertPromises);
}

export async function listExpenses(userId: string, filters?: { category?: string; startDate?: string; endDate?: string }) {
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
  query += ` ORDER BY created_at DESC`;
  const result = await db.query(query, values);
  return result.rows;
}

// =============== RECEIPTS & MEDIA =================

export async function uploadReceipt(expenseId: string, fileUrl: string) {
  const db = await connectToPostgres();
  const query = `INSERT INTO receipts (expense_id, file_url, uploaded_at) VALUES ($1, $2, NOW()) RETURNING *`;
  const result = await db.query(query, [expenseId, fileUrl]);
  return result.rows[0];
}

export async function getReceipts(expenseId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM receipts WHERE expense_id = $1`, [expenseId]);
  return result.rows;
}

// =============== ANALYTICS =================

export async function getSpendByCategory(userId: string, month: number, year: number) {
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

export async function getMonthlySummary(userId: string) {
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

export async function getFriendContributions(groupId: string) {
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

export async function getWeeklySummary(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT DATE_TRUNC('week', created_at) as week, SUM(amount) as total
     FROM expenses
     WHERE user_id = $1
     GROUP BY week
     ORDER BY week DESC`,
    [userId]
  );
  return result.rows;
}

export async function getCategorySpending(userId: string, category: string, startDate?: string, endDate?: string) {
  const db = await connectToPostgres();
  let query = `
    SELECT subcategory, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE user_id = $1 AND category = $2`;
  const values: any[] = [userId, category];
  
  if (startDate && endDate) {
    query += ` AND created_at BETWEEN $3 AND $4`;
    values.push(startDate, endDate);
  }
  
  query += ` GROUP BY subcategory ORDER BY total DESC`;
  const result = await db.query(query, values);
  return result.rows;
}

// =============== NOTIFICATIONS =================

export async function pushNotification(userId: string, message: string) {
  const db = await connectToPostgres();
  const query = `INSERT INTO notifications (user_id, message, status, created_at) VALUES ($1, $2, 'pending', NOW()) RETURNING *`;
  const result = await db.query(query, [userId, message]);
  return result.rows[0];
}

export async function listNotifications(userId: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return result.rows;
}

export async function acknowledgeNotification(notificationId: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `UPDATE notifications SET status = 'read' WHERE id = $1 RETURNING *`,
    [notificationId]
  );
  return result.rows[0];
}

// =============== UTILITY FUNCTIONS =================

export async function getUserByEmail(email: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0] || null;
}

export async function getUserByPhone(phone: string) {
  const db = await connectToPostgres();
  const result = await db.query(`SELECT * FROM users WHERE phone = $1`, [phone]);
  return result.rows[0] || null;
}

export async function searchAllUsers(searchTerm: string) {
  const db = await connectToPostgres();
  const result = await db.query(
    `SELECT id, name, email, phone 
     FROM users 
     WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`,
    [`%${searchTerm}%`]
  );
  return result.rows;
}

export async function createExpenseWithSplit(
  userId: string,
  amount: number,
  category: string,
  subcategory: string,
  description: string,
  friendIds: string[],
  splitType: 'equal' | 'custom' = 'equal',
  customSplits?: { userId: string; amount: number }[]
) {
  const db = await connectToPostgres();
  const expenseId = uuidv4();
  
  try {
    await db.query('BEGIN');
    
    // Create expense
    const expense = await addExpense({
      id: expenseId,
      userId,
      category,
      subcategory,
      amount,
      description,
    });
    
    // Calculate splits
    let splits: { userId: string; amount: number }[];
    
    if (splitType === 'equal') {
      const totalPeople = friendIds.length + 1; // Include the user who paid
      const splitAmount = amount / totalPeople;
      splits = [
        { userId, amount: splitAmount },
        ...friendIds.map(fId => ({ userId: fId, amount: splitAmount }))
      ];
    } else {
      splits = customSplits || [];
    }
    
    // Create splits
    await splitExpense(expenseId, splits);
    
    // Send notifications to friends
    for (const friendId of friendIds) {
      await pushNotification(
        friendId,
        `You have been added to a ${category} expense of $${amount} by ${userId}`
      );
    }
    
    await db.query('COMMIT');
    return { expense, splits };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// Get balance between user and a friend (how much friend owes user, positive if friend owes user, negative if user owes friend)
export async function getFriendBalance(userId: string, friendId: string) {
  const db = await connectToPostgres();
  // Sum of what friend owes user
  const owedToUserResult = await db.query(`
    SELECT COALESCE(SUM(es.amount), 0) as total
    FROM expenses e
    JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.user_id = $1 AND es.user_id = $2
  `, [userId, friendId]);
  // Sum of what user owes friend
  const userOwesResult = await db.query(`
    SELECT COALESCE(SUM(es.amount), 0) as total
    FROM expenses e
    JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.user_id = $2 AND es.user_id = $1
  `, [userId, friendId]);
  const owedToUser = parseFloat(owedToUserResult.rows[0].total);
  const userOwes = parseFloat(userOwesResult.rows[0].total);
  // Net balance: positive means friend owes user, negative means user owes friend
  return owedToUser - userOwes;
}

// =============== PARENT-CHILD MONITORING FUNCTIONS =================

// Add a parent-child relationship
export async function addParentChildRelationship(parentId: string, childId: string, thresholdAmount: number = 0) {
  const db = await connectToPostgres();
  
  try {
    await db.query('BEGIN');
    
    // Verify parent exists and has parent role
    const parent = await db.query(`SELECT * FROM users WHERE id = $1 AND role = 'parent'`, [parentId]);
    if (parent.rows.length === 0) {
      throw new Error('Parent user not found or user is not a parent');
    }
    
    // Verify child exists
    const child = await db.query(`SELECT * FROM users WHERE id = $1`, [childId]);
    if (child.rows.length === 0) {
      throw new Error('Child user not found');
    }
    
    // Check if relationship already exists
    const existing = await db.query(`SELECT * FROM parent_child_relationships WHERE parent_id = $1 AND child_id = $2`, [parentId, childId]);
    if (existing.rows.length > 0) {
      throw new Error('Parent-child relationship already exists');
    }
    
    // Create relationship
    const query = `INSERT INTO parent_child_relationships (parent_id, child_id, threshold_amount) VALUES ($1, $2, $3) RETURNING *`;
    const result = await db.query(query, [parentId, childId, thresholdAmount]);
    
    await db.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// Get all children for a parent
export async function getChildrenForParent(parentId: string) {
  const db = await connectToPostgres();
  const query = `
    SELECT 
      pcr.id as relationship_id,
      pcr.threshold_amount,
      pcr.created_at as relationship_created,
      u.id as child_id,
      u.name as child_name,
      u.email as child_email,
      u.phone as child_phone
    FROM parent_child_relationships pcr
    JOIN users u ON pcr.child_id = u.id
    WHERE pcr.parent_id = $1
    ORDER BY pcr.created_at DESC
  `;
  const result = await db.query(query, [parentId]);
  return result.rows;
}

// Update spending threshold for a child
export async function updateChildThreshold(relationshipId: string, thresholdAmount: number) {
  const db = await connectToPostgres();
  const query = `UPDATE parent_child_relationships SET threshold_amount = $1 WHERE id = $2 RETURNING *`;
  const result = await db.query(query, [thresholdAmount, relationshipId]);
  return result.rows[0];
}

// Get child's total spending (only their share of split expenses)
export async function getChildTotalSpending(childId: string, startDate?: string, endDate?: string) {
  const db = await connectToPostgres();
  let query = `
    SELECT COALESCE(SUM(es.amount), 0) as total_spending
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id = $1
  `;
  const values: any[] = [childId];
  
  if (startDate && endDate) {
    query += ` AND e.created_at BETWEEN $2 AND $3`;
    values.push(startDate, endDate);
  }
  
  const result = await db.query(query, values);
  return parseFloat(result.rows[0].total_spending) || 0;
}

// Add child by email and phone number (for parent to call)
export async function addChildByEmailAndPhone(parentId: string, childEmail: string, childPhone: string, thresholdAmount: number = 0) {
  const db = await connectToPostgres();
  
  try {
    await db.query('BEGIN');
    
    // Find child by email and phone
    const child = await db.query(`SELECT * FROM users WHERE email = $1 AND phone = $2`, [childEmail, childPhone]);
    if (child.rows.length === 0) {
      throw new Error('Child not found with the provided email and phone number');
    }
    
    const childId = child.rows[0].id;
    
    // Create parent-child relationship
    const relationship = await addParentChildRelationship(parentId, childId, thresholdAmount);
    
    await db.query('COMMIT');
    return {
      relationship,
      child: child.rows[0]
    };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// Log notification to prevent duplicates
export async function logNotification(relationshipId: string, type: 'spending_threshold' | 'safety_alert', alertType: string, message: string) {
  const db = await connectToPostgres();
  const query = `INSERT INTO notification_logs (relationship_id, type, alert_type, message) VALUES ($1, $2, $3, $4) RETURNING *`;
  const result = await db.query(query, [relationshipId, type, alertType, message]);
  return result.rows[0];
}

// Check if notification was already sent for this threshold
export async function checkNotificationSent(relationshipId: string, alertType: string) {
  const db = await connectToPostgres();
  const query = `SELECT * FROM notification_logs WHERE relationship_id = $1 AND alert_type = $2 ORDER BY sent_at DESC LIMIT 1`;
  const result = await db.query(query, [relationshipId, alertType]);
  return result.rows.length > 0;
}

// Get child spending details for analytics
export async function getChildSpendingAnalytics(childId: string, startDate?: string, endDate?: string) {
  const db = await connectToPostgres();
  let query = `
    SELECT 
      e.category,
      e.subcategory,
      e.description,
      es.amount,
      e.created_at,
      u.name as payer_name
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE es.user_id = $1
  `;
  const values: any[] = [childId];
  
  if (startDate && endDate) {
    query += ` AND e.created_at BETWEEN $2 AND $3`;
    values.push(startDate, endDate);
  }
  
  query += ` ORDER BY e.created_at DESC`;
  const result = await db.query(query, values);
  return result.rows;
}

// Get child spending by category for analytics
export async function getChildSpendingByCategory(childId: string, startDate?: string, endDate?: string) {
  const db = await connectToPostgres();
  let query = `
    SELECT 
      e.category,
      SUM(es.amount) as total_amount,
      COUNT(*) as transaction_count
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id = $1
  `;
  const values: any[] = [childId];
  
  if (startDate && endDate) {
    query += ` AND e.created_at BETWEEN $2 AND $3`;
    values.push(startDate, endDate);
  }
  
  query += ` GROUP BY e.category ORDER BY total_amount DESC`;
  const result = await db.query(query, values);
  return result.rows;
}

// Get spending by specific category for a timeframe
export async function getSpendingByCategory(userId: string, category: string, timeframe: string = 'this_month') {
  const db = await connectToPostgres();
  
  // Calculate date range based on timeframe
  let startDate: Date;
  let endDate: Date = new Date();
  
  switch (timeframe) {
    case 'this_month':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case 'last_month':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      break;
    case 'this_year':
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
    case 'last_30_days':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  }
  
  // Get total spending for the category
  const totalQuery = `
    SELECT COALESCE(SUM(e.amount), 0) as total
    FROM expenses e
    WHERE e.user_id = $1 
    AND LOWER(e.category) = LOWER($2)
    AND e.created_at BETWEEN $3 AND $4
  `;
  
  const totalResult = await db.query(totalQuery, [userId, category, startDate, endDate]);
  const total = parseFloat(totalResult.rows[0]?.total || '0');
  
  // Get breakdown by subcategory
  const breakdownQuery = `
    SELECT 
      e.subcategory,
      COALESCE(SUM(e.amount), 0) as amount,
      COUNT(*) as count
    FROM expenses e
    WHERE e.user_id = $1 
    AND LOWER(e.category) = LOWER($2)
    AND e.created_at BETWEEN $3 AND $4
    GROUP BY e.subcategory
    ORDER BY amount DESC
  `;
  
  const breakdownResult = await db.query(breakdownQuery, [userId, category, startDate, endDate]);
  const breakdown = breakdownResult.rows.map(row => ({
    subcategory: row.subcategory || 'Other',
    amount: parseFloat(row.amount),
    count: parseInt(row.count)
  }));
  
  return {
    total: total.toFixed(2),
    breakdown,
    timeframe,
    category,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    }
  };
}

// Get top spending categories for a user
export async function getTopSpendingCategories(userId: string, timeframe: string = 'this_month', limit: number = 5) {
  const db = await connectToPostgres();
  
  // Calculate date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now);
  
  switch (timeframe) {
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const query = `
    SELECT 
      category,
      COUNT(*) as transaction_count,
      SUM(amount) as total,
      AVG(amount) as average
    FROM expenses 
    WHERE user_id = $1 
      AND created_at >= $2 
      AND created_at <= $3
      AND category IS NOT NULL
      AND category != ''
    GROUP BY category
    ORDER BY total DESC
    LIMIT $4
  `;
  
  const result = await db.query(query, [userId, startDate.toISOString(), endDate.toISOString(), limit]);
  
  return result.rows.map(row => ({
    category: row.category,
    total: parseFloat(row.total).toFixed(2),
    transactionCount: parseInt(row.transaction_count),
    average: parseFloat(row.average).toFixed(2)
  }));
}
