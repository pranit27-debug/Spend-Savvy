import { NextRequest, NextResponse } from 'next/server';
import { geminiSplitter } from '../../../../lib/gemini';
import { connectToPostgres } from '../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { description, userId, friendIds, totalAmount, category } = await request.json();

    if (!description || !userId) {
      return NextResponse.json(
        { error: 'Description and userId are required' },
        { status: 400 }
      );
    }

    const db = await connectToPostgres();

    // Get user info
    const userResult = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUser = userResult.rows[0];

    // Get friends to include in the split
    let friends = [];
    if (friendIds && friendIds.length > 0) {
      // Use specific friends provided
      const friendsResult = await db.query(
        `SELECT u.id, u.name, u.email 
         FROM users u 
         WHERE u.id = ANY($1)`,
        [friendIds]
      );
      friends = friendsResult.rows;
    } else {
      // Use all friends if none specified
      const friendsResult = await db.query(
        `SELECT u.id, u.name, u.email 
         FROM users u 
         INNER JOIN friends f ON u.id = f.friend_id 
         WHERE f.user_id = $1`,
        [userId]
      );
      friends = friendsResult.rows;
    }

    if (friends.length === 0) {
      return NextResponse.json(
        { error: 'No friends found to split with. Add some friends first!' },
        { status: 400 }
      );
    }

    // Use Gemini AI to split the expense
    const expenseSplit = await geminiSplitter.splitExpense(
      description,
      friends,
      currentUser,
      totalAmount,
      category
    );

    return NextResponse.json({
      success: true,
      expenseSplit
    });

  } catch (error) {
    console.error('Error in AI expense split:', error);
    return NextResponse.json(
      { error: 'Failed to process expense split' },
      { status: 500 }
    );
  }
}
