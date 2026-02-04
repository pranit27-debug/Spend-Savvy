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
    const balancesCacheKey = cacheKeys.balances(userId);
    console.log(`🔍 [BALANCES] Checking cache for key: ${balancesCacheKey}`);
    
    const cachedBalances = await cache.get(balancesCacheKey);
    if (cachedBalances) {
      console.log('✅ [BALANCES] CACHE HIT! Returning balance data from Redis cache');
      console.log(`💰 [BALANCES] Cached balance summary: You owe $${cachedBalances.summary?.totalYouOwe || 0}, Owed to you $${cachedBalances.summary?.totalOwedToYou || 0}`);
      return NextResponse.json(cachedBalances);
    }

    console.log('❌ [BALANCES] CACHE MISS! Fetching balance data from database...');

    console.log('Fetching balances for userId:', userId);

    const pool = await connectToPostgres();
    
    // Get all UNPAID expense splits involving this user
    const query = `
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
    `;
    
    const result = await pool.query(query, [userId]);
    console.log('Raw balance data (unpaid only):', result.rows.map(row => ({
      expense_id: row.expense_id,
      user_id: row.user_id,
      amount: row.user_amount,
      paid: row.paid,
      description: row.description,
      created_by: row.created_by
    })));

    // Process the data to calculate balances
    const balances = new Map();
    
    for (const row of result.rows) {
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
    
    const summary = {
      totalOwedToYou: balanceArray.reduce((sum, b) => sum + b.owesYou, 0),
      totalYouOwe: balanceArray.reduce((sum, b) => sum + b.youOwe, 0),
      netBalance: balanceArray.reduce((sum, b) => sum + b.netBalance, 0),
      friendCount: balanceArray.length
    };
    
    console.log('Processed balances:', { summary, balances: balanceArray });

    const response = {
      success: true,
      summary,
      balances: balanceArray
    };

    // Cache the result for 10 minutes
    console.log('💾 [BALANCES] Storing balance data in Redis cache...');
    await cache.set(balancesCacheKey, response, cacheTTL.MEDIUM);
    console.log('✅ [BALANCES] Balance data successfully cached in Redis');
    console.log(`💰 [BALANCES] Cached balance summary: You owe $${summary.totalYouOwe}, Owed to you $${summary.totalOwedToYou}, Net: $${summary.netBalance}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}
