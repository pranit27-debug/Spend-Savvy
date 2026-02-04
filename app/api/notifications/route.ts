import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../lib/db';
import { cache, cacheKeys, cacheTTL, invalidateCache } from '../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Try to get from cache first
    const notificationsCacheKey = cacheKeys.notifications(userId);
    console.log(`🔍 [NOTIFICATIONS] Checking cache for key: ${notificationsCacheKey}`);
    
    const cachedNotifications = await cache.get(notificationsCacheKey);
    if (cachedNotifications) {
      console.log('✅ [NOTIFICATIONS] CACHE HIT! Returning notifications from Redis cache');
      console.log(`🔔 [NOTIFICATIONS] Cached: ${cachedNotifications.notifications?.length || 0} notifications, ${cachedNotifications.unreadCount || 0} unread`);
      return NextResponse.json(cachedNotifications);
    }

    console.log('❌ [NOTIFICATIONS] CACHE MISS! Fetching notifications from database...');

    const pool = await connectToPostgres();
    
    // Get unread notifications for this user
    const query = `
      SELECT 
        id,
        message,
        type,
        data,
        created_at,
        is_read
      FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    const notifications = result.rows.map(row => ({
      id: row.id,
      message: row.message,
      type: row.type,
      data: row.data, // JSONB data is already parsed by PostgreSQL
      createdAt: row.created_at,
      isRead: row.is_read
    }));

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const response = {
      success: true,
      notifications,
      unreadCount
    };

    // Cache the result for 3 minutes (notifications change frequently)
    console.log('💾 [NOTIFICATIONS] Storing notifications in Redis cache...');
    await cache.set(notificationsCacheKey, response, cacheTTL.SHORT);
    console.log('✅ [NOTIFICATIONS] Notifications successfully cached in Redis');
    console.log(`🔔 [NOTIFICATIONS] Cached: ${notifications.length} notifications, ${unreadCount} unread`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, type, message, data } = await request.json();

    if (!userId || !message) {
      return NextResponse.json({ error: 'UserId and message are required' }, { status: 400 });
    }

    const pool = await connectToPostgres();
    
    // Create notification
    const query = `
      INSERT INTO notifications (id, user_id, type, message, data, created_at, is_read)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), false)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId,
      type || 'general',
      message,
      data ? JSON.stringify(data) : null
    ]);

    // Invalidate notifications cache for the user
    await invalidateCache.notifications(userId);

    return NextResponse.json({
      success: true,
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, markAllAsRead } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const pool = await connectToPostgres();
    
    let query;
    let params;
    
    if (markAllAsRead) {
      // Mark all notifications as read for this user
      query = `
        UPDATE notifications 
        SET is_read = true 
        WHERE user_id = $1 AND is_read = false
        RETURNING id
      `;
      params = [userId];
    } else {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }
    
    const result = await pool.query(query, params);

    // Invalidate notifications cache for the user
    await invalidateCache.notifications(userId);

    return NextResponse.json({
      success: true,
      updatedCount: result.rowCount
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
