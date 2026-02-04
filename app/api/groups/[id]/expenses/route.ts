import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  
  try {
    const { id } = await params;
    const url = new URL(request.url);
    userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();

    // First check if user is a member of this group
    const memberCheck = await db.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get group expenses with splits
    const expensesQuery = `
      SELECT 
        e.id,
        e.description,
        e.amount,
        e.category,
        e.created_at,
        e.user_id as created_by,
        u.name as created_by_name,
        COALESCE(
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'user_id', es.user_id,
              'user_name', us.name,
              'amount', es.amount,
              'paid', COALESCE(es.paid, false)
            )
          ) FILTER (WHERE es.user_id IS NOT NULL),
          ARRAY[]::json[]
        ) as splits
      FROM expenses e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN expense_splits es ON e.id = es.expense_id
      LEFT JOIN users us ON es.user_id = us.id
      WHERE e.group_id = $1
      GROUP BY e.id, e.description, e.amount, e.category, e.created_at, e.user_id, u.name
      ORDER BY e.created_at DESC
    `;

    const expensesResult = await db.query(expensesQuery, [id]);

    const expenses = expensesResult.rows.map((row: any) => ({
      id: row.id,
      description: row.description,
      amount: parseFloat(row.amount),
      category: row.category,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      splits: row.splits || []
    }));

    return NextResponse.json({
      success: true,
      expenses
    });

  } catch (error) {
    console.error('Database error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group expenses' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, amount, category, subcategory, splits, createdBy } = body;
    userId = createdBy;

    if (!userId || !description || !amount || !category || !splits) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();

    // First check if user is a member of this group
    const memberCheck = await db.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create the expense
    const expenseId = `expense_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    await db.query(
      'INSERT INTO expenses (id, user_id, group_id, category, subcategory, amount, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [expenseId, userId, id, category, subcategory || null, amount, description]
    );

    // Create expense splits
    for (const split of splits) {
      await db.query(
        'INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)',
        [expenseId, split.user_id, split.amount]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense created successfully',
      expenseId
    });

  } catch (error) {
    console.error('Database error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
