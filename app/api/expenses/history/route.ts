import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';
import { cache, cacheKeys, cacheTTL } from '../../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const timeframe = url.searchParams.get('timeframe') || 'recent';
    const category = url.searchParams.get('category');
    const friendId = url.searchParams.get('friendId');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Generate cache key for expenses history
    const expensesCacheKey = cacheKeys.expenseHistory(userId, timeframe, category, friendId, limit);
    console.log(`🔍 [EXPENSES] Checking cache for key: ${expensesCacheKey}`);
    
    // Try to get from cache first
    const cachedExpenses = await cache.get(expensesCacheKey);
    if (cachedExpenses) {
      console.log('✅ [EXPENSES] CACHE HIT! Returning expense history from Redis cache');
      console.log(`💸 [EXPENSES] Cached: ${cachedExpenses.expenses?.length || 0} expenses for timeframe: ${timeframe}`);
      return NextResponse.json(cachedExpenses);
    }

    console.log('❌ [EXPENSES] CACHE MISS! Fetching expense history from database...');

    const db = await connectToPostgres();

    // Determine date range based on timeframe
    let dateCondition = '';
    const now = new Date();
    
    switch (timeframe) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateCondition = `AND e.created_at >= '${todayStart.toISOString()}'`;
        break;
      case 'this_week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateCondition = `AND e.created_at >= '${weekStart.toISOString()}'`;
        break;
      case 'this_month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateCondition = `AND e.created_at >= '${monthStart.toISOString()}'`;
        break;
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        dateCondition = `AND e.created_at >= '${lastMonthStart.toISOString()}' AND e.created_at <= '${lastMonthEnd.toISOString()}'`;
        break;
      case 'recent':
      default:
        // No date filter for recent
        break;
    }

    let query = `
      SELECT 
        e.id,
        e.description,
        e.category,
        e.subcategory,
        e.amount as total_amount,
        e.created_at,
        e.group_id,
        COALESCE(es.amount, 0) as user_amount,
        COALESCE(es.paid, false) as user_paid,
        u.name as created_by_name,
        e.user_id as created_by,
        CASE 
          WHEN e.group_id IS NOT NULL THEN g.name
          ELSE NULL 
        END as group_name,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'user_id', es_all.user_id,
            'user_name', u_all.name,
            'amount', es_all.amount,
            'paid', COALESCE(es_all.paid, false)
          )
        ) as all_splits
      FROM expenses e
      LEFT JOIN expense_splits es ON e.id = es.expense_id AND es.user_id = $1
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN groups g ON e.group_id = g.id
      INNER JOIN expense_splits es_all ON e.id = es_all.expense_id
      INNER JOIN users u_all ON es_all.user_id = u_all.id
      WHERE (
        e.user_id = $1 OR 
        EXISTS (
          SELECT 1 FROM expense_splits es_check 
          WHERE es_check.expense_id = e.id AND es_check.user_id = $1
        ) OR
        (e.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = e.group_id AND gm.user_id = $1
        ))
      ) ${dateCondition}
    `;

    const params = [userId];
    let paramIndex = 2;

    if (category) {
      query += ` AND LOWER(e.category) = LOWER($${paramIndex})`;
      params.push(category);
      paramIndex++;
    }

    if (friendId) {
      query += ` AND EXISTS (
        SELECT 1 FROM expense_splits es_friend 
        WHERE es_friend.expense_id = e.id AND es_friend.user_id = $${paramIndex}
      )`;
      params.push(friendId);
      paramIndex++;
    }

    query += `
      GROUP BY e.id, e.description, e.category, e.subcategory, e.amount, e.created_at, e.group_id, es.amount, es.paid, u.name, e.user_id, g.name
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit.toString());

    const result = await db.query(query, params);

    const expenses = result.rows.map((row: any) => ({
      id: row.id,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory,
      total_amount: parseFloat(row.total_amount),
      user_amount: parseFloat(row.user_amount || 0),
      created_at: row.created_at,
      created_by: row.created_by,
      group_id: row.group_id,
      group_name: row.group_name,
      paid: row.user_paid || false,
      splits: row.all_splits.map((split: any) => ({
        user_id: split.user_id,
        user_name: split.user_name,
        amount: parseFloat(split.amount),
        paid: split.paid || false
      }))
    }));

    const response = {
      success: true,
      expenses,
      timeframe,
      category,
      count: expenses.length
    };

    // Cache the result for 10 minutes
    console.log('💾 [EXPENSES] Storing expense history in Redis cache...');
    await cache.set(expensesCacheKey, response, cacheTTL.MEDIUM);
    console.log('✅ [EXPENSES] Expense history successfully cached in Redis');
    console.log(`💸 [EXPENSES] Cached: ${expenses.length} expenses for timeframe: ${timeframe}, category: ${category || 'all'}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching expense history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense history' },
      { status: 500 }
    );
  }
}
