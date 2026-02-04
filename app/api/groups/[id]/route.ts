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
        { success: false, error: 'Group not found or access denied' },
        { status: 404 }
      );
    }

    // Get group basic details
    const groupQuery = `
      SELECT 
        g.id,
        g.name,
        g.created_by,
        g.created_at,
        u.name as created_by_name
      FROM groups g
      INNER JOIN users u ON g.created_by = u.id
      WHERE g.id = $1
    `;

    const groupResult = await db.query(groupQuery, [id]);

    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get group members
    const membersQuery = `
      SELECT 
        gm.user_id,
        u.name as user_name,
        u.email as user_email,
        gm.joined_at
      FROM group_members gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.joined_at ASC
    `;

    const membersResult = await db.query(membersQuery, [id]);

    // Get total expenses
    const expensesQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE group_id = $1
    `;

    const expensesResult = await db.query(expensesQuery, [id]);

    const group = groupResult.rows[0];
    const members = membersResult.rows.map((row: any) => ({
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      joined_at: row.joined_at
    }));
    const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses);

    // Format the response
    const formattedGroup = {
      id: group.id,
      name: group.name,
      created_by: group.created_by,
      created_at: group.created_at,
      created_by_name: group.created_by_name,
      memberCount: members.length,
      totalExpenses: totalExpenses,
      members: members
    };

    return NextResponse.json({
      success: true,
      group: formattedGroup
    });

  } catch (error) {
    console.error('Database error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group details' },
      { status: 500 }
    );
  }
}
