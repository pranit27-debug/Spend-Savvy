import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, splitUserId } = await request.json();
    const db = await connectToPostgres();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (splitUserId) {
      // Update payment status for a specific split
      await db.query(`
        UPDATE expense_splits 
        SET paid = true, paid_at = NOW()
        WHERE expense_id = $1 
        AND user_id = $2
      `, [id, splitUserId]);

      return NextResponse.json({
        success: true,
        message: 'Split payment updated successfully'
      });
    } else {
      // Update payment status for the entire expense (user's portion)
      await db.query(`
        UPDATE expense_splits 
        SET paid = true, paid_at = NOW()
        WHERE expense_id = $1 
        AND user_id = $2
      `, [id, userId]);

      return NextResponse.json({
        success: true,
        message: 'Expense payment updated successfully'
      });
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment status' },
      { status: 500 }
    );
  }
}
