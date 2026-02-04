import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '@/lib/db';
import { cache, cacheKeys, cacheTTL, invalidateCache } from '@/lib/redis';

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

    // Try to get from cache first
    const messagesCacheKey = `group_messages:${id}`;
    const cachedMessages = await cache.get(messagesCacheKey);
    if (cachedMessages) {
      return NextResponse.json(cachedMessages);
    }

    // Get group messages
    const messagesQuery = `
      SELECT 
        gm.id,
        gm.message,
        gm.created_at,
        gm.user_id,
        u.name as user_name
      FROM group_messages gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.created_at DESC
      LIMIT 50
    `;

    const messagesResult = await db.query(messagesQuery, [id]);

    const messages = messagesResult.rows.map((row: any) => ({
      id: row.id,
      message: row.message,
      created_at: row.created_at,
      user_id: row.user_id,
      user_name: row.user_name
    }));

    const response = {
      success: true,
      messages: messages.reverse() // Return in chronological order
    };

    // Cache the result for 3 minutes (messages change frequently)
    await cache.set(messagesCacheKey, response, cacheTTL.SHORT);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Database error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group messages' },
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
    const { message, userId: senderId } = body;
    userId = senderId;

    if (!userId || !message) {
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

    // Create the message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    await db.query(
      'INSERT INTO group_messages (id, group_id, user_id, message) VALUES ($1, $2, $3, $4)',
      [messageId, id, userId, message]
    );

    // Get the created message with user info
    const messageResult = await db.query(
      `SELECT 
        gm.id,
        gm.message,
        gm.created_at,
        gm.user_id,
        u.name as user_name
       FROM group_messages gm
       INNER JOIN users u ON gm.user_id = u.id
       WHERE gm.id = $1`,
      [messageId]
    );

    const createdMessage = messageResult.rows[0];

    // Invalidate messages cache for this group
    await cache.del(`group_messages:${id}`);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: createdMessage.id,
        message: createdMessage.message,
        created_at: createdMessage.created_at,
        user_id: createdMessage.user_id,
        user_name: createdMessage.user_name
      }
    });

  } catch (error) {
    console.error('Database error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId
    });
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
