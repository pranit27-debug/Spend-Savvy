import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../lib/db';
import { cache, cacheKeys, cacheTTL } from '../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Try to get from cache first
    const dashboardCacheKey = `dashboard:${userId}`;
    console.log(`🔍 Checking cache for key: ${dashboardCacheKey}`);
    
    const cachedDashboard = await cache.get(dashboardCacheKey);
    if (cachedDashboard) {
      console.log('✅ CACHE HIT! Returning dashboard data from Redis cache');
      console.log(`📊 Cached data includes: ${cachedDashboard.expenses?.expenses?.length || 0} expenses, ${cachedDashboard.groups?.groups?.length || 0} groups`);
      return NextResponse.json({
        ...cachedDashboard,
        cached: true,
        cacheSource: 'Redis'
      });
    }

    console.log('❌ CACHE MISS! Fetching dashboard data from database...');
    const db = await connectToPostgres();

    // Execute all queries in parallel for better performance
    const [expensesResult, groupsResult, balancesResult] = await Promise.all([
      // 1. Get expenses history
      db.query(`
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
        )
        GROUP BY e.id, e.description, e.category, e.subcategory, e.amount, e.created_at, e.group_id, es.amount, es.paid, u.name, e.user_id, g.name
        ORDER BY e.created_at DESC
        LIMIT 50
      `, [userId]),

      // 2. Get groups
      db.query(`
        WITH user_groups AS (
          SELECT DISTINCT group_id
          FROM group_members
          WHERE user_id = $1
        ),
        group_stats AS (
          SELECT 
            g.id,
            COUNT(DISTINCT e.id) as expense_count,
            COALESCE(SUM(e.amount), 0) as total_expenses
          FROM groups g
          LEFT JOIN expenses e ON g.id = e.group_id
          WHERE g.id IN (SELECT group_id FROM user_groups)
          GROUP BY g.id
        )
        SELECT 
          g.id,
          g.name,
          g.created_by,
          g.created_at,
          u.name as created_by_name,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'user_id', gm.user_id,
              'user_name', um.name,
              'user_email', um.email,
              'joined_at', gm.joined_at
            )
          ) as members,
          COUNT(gm.user_id) as member_count,
          COALESCE(gs.expense_count, 0) as expense_count,
          COALESCE(gs.total_expenses, 0) as total_expenses
        FROM groups g
        INNER JOIN user_groups ug ON g.id = ug.group_id
        INNER JOIN group_members gm ON g.id = gm.group_id
        INNER JOIN users u ON g.created_by = u.id
        INNER JOIN users um ON gm.user_id = um.id
        LEFT JOIN group_stats gs ON g.id = gs.id
        GROUP BY g.id, g.name, g.created_by, g.created_at, u.name, gs.expense_count, gs.total_expenses
        ORDER BY g.created_at DESC
      `, [userId]),

      // 3. Get balances
      db.query(`
        SELECT 
          es.expense_id,
          es.user_id,
          es.amount as user_amount,
          es.paid,
          e.description,
          e.amount as total_amount,
          e.category,
          e.created_at,
          e.user_id as created_by,
          u.name as created_by_name,
          split_user.name as split_user_name
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        JOIN users u ON e.user_id = u.id
        JOIN users split_user ON es.user_id = split_user.id
        WHERE (e.user_id = $1 OR es.user_id = $1) 
          AND COALESCE(es.paid, false) = false
        ORDER BY e.created_at DESC
      `, [userId])
    ]);

    // Process expenses data
    const expenses = expensesResult.rows.map((row: any) => ({
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

    // Process groups data
    const groups = groupsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      members: row.members || [],
      memberCount: parseInt(row.member_count) || 0,
      totalExpenses: parseFloat(row.total_expenses) || 0,
      expense_count: parseInt(row.expense_count) || 0
    }));

    // Process balances data
    const balances = new Map();
    
    for (const row of balancesResult.rows) {
      // Skip if this user created the expense and is also splitting it with themselves
      if (row.created_by === userId && row.user_id === userId) {
        continue;
      }
      
      if (row.created_by === userId) {
        // This user paid for the expense, others owe them
        const otherUserId = row.user_id;
        const otherUserName = row.split_user_name;
        const amount = parseFloat(row.user_amount);
        
        if (!balances.has(otherUserId)) {
          balances.set(otherUserId, {
            userId: otherUserId,
            userName: otherUserName,
            owesYou: 0,
            youOwe: 0,
            netBalance: 0,
            expenses: []
          });
        }
        
        const balance = balances.get(otherUserId);
        balance.owesYou += amount;
        balance.netBalance += amount;
        balance.expenses.push({
          description: row.description,
          amount: amount,
          type: 'owes_you',
          date: row.created_at,
          category: row.category
        });
        
      } else if (row.user_id === userId) {
        // This user owes money for someone else's expense
        const paidByUserId = row.created_by;
        const paidByUserName = row.created_by_name;
        const amount = parseFloat(row.user_amount);
        
        if (!balances.has(paidByUserId)) {
          balances.set(paidByUserId, {
            userId: paidByUserId,
            userName: paidByUserName,
            owesYou: 0,
            youOwe: 0,
            netBalance: 0,
            expenses: []
          });
        }
        
        const balance = balances.get(paidByUserId);
        balance.youOwe += amount;
        balance.netBalance -= amount;
        balance.expenses.push({
          description: row.description,
          amount: amount,
          type: 'you_owe',
          date: row.created_at,
          category: row.category
        });
      }
    }
    
    // Convert map to array and calculate totals
    const balanceArray = Array.from(balances.values());
    
    const balanceSummary = {
      totalOwedToYou: balanceArray.reduce((sum, b) => sum + b.owesYou, 0),
      totalYouOwe: balanceArray.reduce((sum, b) => sum + b.youOwe, 0),
      netBalance: balanceArray.reduce((sum, b) => sum + b.netBalance, 0),
      friendCount: balanceArray.length
    };

    // Combine all dashboard data
    const dashboardData = {
      success: true,
      expenses: {
        expenses,
        timeframe: 'recent',
        count: expenses.length
      },
      groups: {
        groups,
        count: groups.length
      },
      balances: {
        summary: balanceSummary,
        balances: balanceArray
      },
      stats: {
        totalExpenses: expenses.length,
        totalGroups: groups.length,
        totalOwedToYou: balanceSummary.totalOwedToYou,
        totalYouOwe: balanceSummary.totalYouOwe,
        netBalance: balanceSummary.netBalance
      },
      cached: false
    };

    // Cache the result for 5 minutes (shorter TTL since dashboard should be fresh)
    console.log('💾 Storing dashboard data in Redis cache...');
    await cache.set(dashboardCacheKey, dashboardData, cacheTTL.SHORT);
    console.log('✅ Dashboard data successfully cached in Redis');
    console.log(`📊 Cached: ${expenses.length} expenses, ${groups.length} groups, balance summary`);

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
