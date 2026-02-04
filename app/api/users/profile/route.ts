import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = await connectToPostgres();
    
    const query = `
      SELECT 
        id,
        name,
        email,
        phone,
        balance,
        created_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: parseFloat(user.balance || 0),
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}
