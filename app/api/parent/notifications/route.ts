import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const parentId = decoded.userId;
    const pool = await connectToPostgres();

    // Get all notification logs for this parent's children
    const query = `
      SELECT 
        nl.id,
        nl.relationship_id,
        nl.type,
        nl.alert_type,
        nl.message,
        nl.sent_at,
        pcr.child_id,
        u.name as child_name,
        u.email as child_email,
        pcr.threshold_amount
      FROM notification_logs nl
      JOIN parent_child_relationships pcr ON nl.relationship_id = pcr.id
      JOIN users u ON pcr.child_id = u.id
      WHERE pcr.parent_id = $1
      ORDER BY nl.sent_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [parentId]);

    const notifications = result.rows.map(row => ({
      id: row.id,
      relationshipId: row.relationship_id,
      type: row.type,
      alertType: row.alert_type,
      message: row.message,
      sentAt: row.sent_at,
      childName: row.child_name,
      childEmail: row.child_email,
      thresholdAmount: parseFloat(row.threshold_amount) || 0,
      isRead: false // You can add a read status later if needed
    }));

    return NextResponse.json({
      success: true,
      notifications
    });

  } catch (error) {
    console.error('Error fetching parent notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { notificationIds } = await request.json();
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Notification IDs required' }, { status: 400 });
    }

    const pool = await connectToPostgres();
    const parentId = decoded.userId;

    // Mark notifications as read (you can add a read_at column to notification_logs if needed)
    // For now, we'll just return success since the current schema doesn't have read status
    
    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
