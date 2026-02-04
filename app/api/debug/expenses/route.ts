import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();

    // Get all expenses for the user
    const expensesQuery = `
      SELECT 
        e.id,
        e.description,
        e.amount as total_amount,
        e.category,
        e.created_at,
        es.amount as user_amount
      FROM expenses e
      INNER JOIN expense_splits es ON e.id = es.expense_id
      WHERE es.user_id = $1
      ORDER BY e.created_at DESC
    `;
    
    const expensesResult = await db.query(expensesQuery, [userId]);
    
    // Also get total count of all expenses and expense_splits
    const totalExpenses = await db.query('SELECT COUNT(*) as count FROM expenses');
    const totalSplits = await db.query('SELECT COUNT(*) as count FROM expense_splits');
    const userSplits = await db.query('SELECT COUNT(*) as count FROM expense_splits WHERE user_id = $1', [userId]);

    return NextResponse.json({
      success: true,
      data: {
        user_expenses: expensesResult.rows,
        total_expenses_in_db: parseInt(totalExpenses.rows[0].count),
        total_splits_in_db: parseInt(totalSplits.rows[0].count),
        user_splits_count: parseInt(userSplits.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Error fetching debug expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}
